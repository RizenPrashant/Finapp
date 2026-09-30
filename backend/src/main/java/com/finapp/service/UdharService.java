package com.finapp.service;

import com.finapp.dto.UdharRecordDTO;
import com.finapp.dto.UdharSettlementDTO;
import com.finapp.model.*;
import com.finapp.model.UdharRecord.UdharStatus;
import com.finapp.model.UdharRecord.UdharType;
import com.finapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UdharService {

    private final UdharRecordRepository udharRecordRepository;
    private final UdharTransactionLinkRepository udharTransactionLinkRepository;
    private final TransactionRepository transactionRepository;

    public List<UdharRecord> getAllRecords(User user) {
        return udharRecordRepository.findByUserOrderByDateDesc(user);
    }

    public List<UdharRecord> getRecordsByType(User user, UdharType type) {
        return udharRecordRepository.findByUserAndTypeOrderByDateDesc(user, type);
    }

    public UdharRecord getRecordById(Long id, User user) {
        return udharRecordRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Udhar record not found: " + id));
    }

    @Transactional
    public UdharRecord createRecord(UdharRecordDTO dto, User user) {
        // Create the udhar record
        UdharRecord record = UdharRecord.builder()
                .personName(dto.getPersonName())
                .mobileNumber(dto.getMobileNumber())
                .totalAmount(dto.getTotalAmount())
                .settledAmount(BigDecimal.ZERO)
                .type(dto.getType())
                .status(UdharStatus.PENDING)
                .date(dto.getDate())
                .notes(dto.getNotes())
                .user(user)
                .build();

        record = udharRecordRepository.save(record);

        // Create a transaction for this udhar
        TransactionType txType = dto.getType() == UdharType.GIVEN ? TransactionType.DEBIT : TransactionType.CREDIT;
        String title = dto.getType() == UdharType.GIVEN
                ? "Udhar diya: " + dto.getPersonName()
                : "Udhar liya: " + dto.getPersonName();

        Transaction transaction = Transaction.builder()
                .title(title)
                .amount(dto.getTotalAmount())
                .type(txType)
                .category("Udhar")
                .budgetCategory("Udhar")
                .date(dto.getDate())
                .description(dto.getNotes())
                .paymentSource("")
                .isUdhar(true)
                .user(user)
                .build();

        transaction = transactionRepository.save(transaction);

        // Link transaction to udhar record
        UdharTransactionLink link = UdharTransactionLink.builder()
                .udharRecord(record)
                .transaction(transaction)
                .transactionType(UdharTransactionLink.TransactionType.ORIGINAL)
                .amount(dto.getTotalAmount())
                .build();

        udharTransactionLinkRepository.save(link);

        return record;
    }

    // Creates udhar record and links to an existing transaction (no new transaction created)
    @Transactional
    public UdharRecord createRecordFromTransaction(UdharRecordDTO dto, Transaction transaction, User user) {
        UdharRecord record = UdharRecord.builder()
                .personName(dto.getPersonName())
                .mobileNumber(dto.getMobileNumber())
                .totalAmount(dto.getTotalAmount())
                .settledAmount(BigDecimal.ZERO)
                .type(dto.getType())
                .status(UdharStatus.PENDING)
                .date(dto.getDate())
                .notes(dto.getNotes())
                .user(user)
                .build();

        record = udharRecordRepository.save(record);

        UdharTransactionLink link = UdharTransactionLink.builder()
                .udharRecord(record)
                .transaction(transaction)
                .transactionType(UdharTransactionLink.TransactionType.ORIGINAL)
                .amount(dto.getTotalAmount())
                .build();

        udharTransactionLinkRepository.save(link);
        return record;
    }

    /**
     * The record a transaction created by being marked as udhar.
     *
     * A transaction can also be linked as somebody else's settlement, which
     * is a different relationship, so only the ORIGINAL link counts here.
     */
    public UdharRecord findOriginalRecord(Transaction transaction) {
        return udharTransactionLinkRepository.findByTransaction(transaction).stream()
                .filter(l -> l.getTransactionType() == UdharTransactionLink.TransactionType.ORIGINAL)
                .map(l -> udharRecordRepository.findById(l.getUdharRecord().getId()).orElse(null))
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    /**
     * Carry an edit of the transaction through to the udhar record it created.
     *
     * Reopening a transaction that was marked as udhar used to offer only the
     * tick: who it was with and which way it went were stored on the record
     * and never sent back, so they could not be shown and an edit of them had
     * nowhere to go.
     *
     * The amount follows the transaction, since the two describe the same
     * movement of money. There is nothing to clamp it against: a repayment
     * is a separate entry, not a number carried on this one.
     */
    @Transactional
    public UdharRecord updateOriginalRecord(Transaction transaction, UdharRecordDTO dto) {
        UdharRecord record = findOriginalRecord(transaction);
        if (record == null) return null;

        if (dto.getPersonName() != null && !dto.getPersonName().isBlank()) {
            record.setPersonName(dto.getPersonName());
        }
        record.setMobileNumber(dto.getMobileNumber());
        if (dto.getType() != null) record.setType(dto.getType());
        if (dto.getDate() != null) record.setDate(dto.getDate());

        if (dto.getTotalAmount() != null) record.setTotalAmount(dto.getTotalAmount());

        return udharRecordRepository.save(record);
    }

    // Unlink a transaction from udhar — reverses settlement or unmarks if original
    @Transactional
    public void unlinkTransaction(Transaction transaction) {
        List<UdharTransactionLink> links = udharTransactionLinkRepository.findByTransaction(transaction);
        for (UdharTransactionLink link : links) {
            UdharRecord record = udharRecordRepository.findById(link.getUdharRecord().getId()).orElse(null);
            if (record == null) continue;

            if (link.getTransactionType() == UdharTransactionLink.TransactionType.SETTLEMENT) {
                // Reverse settlement amount
                BigDecimal newSettled = record.getSettledAmount().subtract(link.getAmount());
                if (newSettled.compareTo(BigDecimal.ZERO) < 0) newSettled = BigDecimal.ZERO;
                record.setSettledAmount(newSettled);
                record.setStatus(newSettled.compareTo(BigDecimal.ZERO) == 0 ? UdharStatus.PENDING : UdharStatus.PARTIAL);
                udharRecordRepository.save(record);
                udharTransactionLinkRepository.delete(link);
            } else if (link.getTransactionType() == UdharTransactionLink.TransactionType.ORIGINAL) {
                // Just unmark — delete the udhar record (links cascade), transaction stays
                udharRecordRepository.delete(record);
            }
        }
    }

    // Settle udhar using an existing transaction (no new transaction created)
    @Transactional
    public void settleUdharWithTransaction(Long udharRecordId, Transaction transaction, BigDecimal amount, User user) {
        UdharRecord against = getRecordById(udharRecordId, user);

        // This capped the amount at the debt's remainder and kept no trace of
        // the rest: paying 1,00,000 against a 60,000 debt recorded 60,000 and
        // silently lost 40,000. An entry carries the whole amount, and the
        // balance takes care of the arithmetic.
        UdharType entryType = against.getType() == UdharType.GIVEN ? UdharType.TAKEN : UdharType.GIVEN;

        UdharRecord entry = udharRecordRepository.save(UdharRecord.builder()
                .personName(against.getPersonName())
                .mobileNumber(against.getMobileNumber())
                .totalAmount(amount)
                .settledAmount(BigDecimal.ZERO)
                .type(entryType)
                .status(UdharStatus.PENDING)
                .date(transaction.getDate())
                .notes(transaction.getDescription())
                .user(user)
                .build());

        udharTransactionLinkRepository.save(UdharTransactionLink.builder()
                .udharRecord(entry)
                .transaction(transaction)
                .transactionType(UdharTransactionLink.TransactionType.ORIGINAL)
                .amount(amount)
                .build());

        transaction.setIsUdhar(true);
        transactionRepository.save(transaction);
    }

    /**
     * Record a repayment as an entry of its own, facing the other way.
     *
     * Money between two people is a running balance, not a set of numbered
     * debts. Paying somebody back used to mean choosing which debt it applied
     * to and was capped at that debt's remainder — so borrowing 40,000 and
     * 60,000 and then repaying 1,00,000 could not be recorded at all, and via
     * the link path the excess was silently dropped.
     *
     * There is nothing to choose and nothing to cap now. A repayment is
     * simply money moving the other way, and the person's balance is what
     * every entry with them adds up to. Pay more than you owe and the balance
     * crosses zero, which is the truth: they owe you the difference.
     */
    @Transactional
    public UdharRecord settleUdhar(UdharSettlementDTO dto, User user) {
        UdharRecord against = getRecordById(dto.getUdharRecordId(), user);

        // The entry faces the opposite way to the one being repaid: money
        // owed to you coming back is money in, and vice versa.
        UdharType entryType = against.getType() == UdharType.GIVEN ? UdharType.TAKEN : UdharType.GIVEN;
        TransactionType txType = against.getType() == UdharType.GIVEN
                ? TransactionType.CREDIT   // they are paying you back
                : TransactionType.DEBIT;   // you are paying them back

        String title = against.getType() == UdharType.GIVEN
                ? "Udhar wapas: " + against.getPersonName()
                : "Udhar chukaya: " + against.getPersonName();

        Transaction repayment = transactionRepository.save(Transaction.builder()
                .title(title)
                .amount(dto.getAmount())
                .type(txType)
                .category("Udhar Settlement")
                .budgetCategory("Udhar")
                .date(dto.getDate())
                .description(dto.getDescription())
                .paymentSource(dto.getPaymentSource())
                .isUdhar(true)
                .user(user)
                .build());

        UdharRecord entry = udharRecordRepository.save(UdharRecord.builder()
                .personName(against.getPersonName())
                .mobileNumber(against.getMobileNumber())
                .totalAmount(dto.getAmount())
                .settledAmount(BigDecimal.ZERO)
                .type(entryType)
                .status(UdharStatus.PENDING)
                .date(dto.getDate())
                .notes(dto.getDescription())
                .user(user)
                .build());

        udharTransactionLinkRepository.save(UdharTransactionLink.builder()
                .udharRecord(entry)
                .transaction(repayment)
                .transactionType(UdharTransactionLink.TransactionType.ORIGINAL)
                .amount(dto.getAmount())
                .build());

        return entry;
    }

    @Transactional
    public void deleteRecord(Long id, User user) {
        UdharRecord record = getRecordById(id, user);

        // Only unmark transactions as udhar, do NOT delete them
        List<UdharTransactionLink> links = udharTransactionLinkRepository.findByUdharRecordOrderByCreatedAtDesc(record);
        for (UdharTransactionLink link : links) {
            Transaction tx = link.getTransaction();
            if (tx != null) {
                tx.setIsUdhar(false);
                transactionRepository.save(tx);
            }
        }

        udharRecordRepository.delete(record);
    }

    public List<UdharTransactionLink> getTransactionLinks(Long udharRecordId, User user) {
        UdharRecord record = getRecordById(udharRecordId, user);
        return udharTransactionLinkRepository.findByUdharRecordOrderByCreatedAtDesc(record);
    }
}
