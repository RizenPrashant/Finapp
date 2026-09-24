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
        UdharRecord record = getRecordById(udharRecordId, user);

        BigDecimal remaining = record.getTotalAmount().subtract(record.getSettledAmount());
        BigDecimal settleAmount = amount.min(remaining); // cap at remaining

        UdharTransactionLink link = UdharTransactionLink.builder()
                .udharRecord(record)
                .transaction(transaction)
                .transactionType(UdharTransactionLink.TransactionType.SETTLEMENT)
                .amount(settleAmount)
                .build();
        udharTransactionLinkRepository.save(link);

        BigDecimal newSettled = record.getSettledAmount().add(settleAmount);
        record.setSettledAmount(newSettled);
        record.setStatus(newSettled.compareTo(record.getTotalAmount()) >= 0 ? UdharStatus.SETTLED : UdharStatus.PARTIAL);
        udharRecordRepository.save(record);

        // Mark transaction as udhar
        transaction.setIsUdhar(true);
        transactionRepository.save(transaction);
    }

    @Transactional
    public UdharRecord settleUdhar(UdharSettlementDTO dto, User user) {
        UdharRecord record = getRecordById(dto.getUdharRecordId(), user);

        BigDecimal remaining = record.getTotalAmount().subtract(record.getSettledAmount());
        if (dto.getAmount().compareTo(remaining) > 0) {
            throw new RuntimeException("Settlement amount cannot exceed remaining balance: " + remaining);
        }

        // Create settlement transaction (opposite type of original)
        TransactionType settlementTxType = record.getType() == UdharType.GIVEN
                ? TransactionType.CREDIT   // If I gave, receiving back is CREDIT
                : TransactionType.DEBIT;   // If I took, paying back is DEBIT

        String title = record.getType() == UdharType.GIVEN
                ? "Udhar wapas: " + record.getPersonName()
                : "Udhar chukaya: " + record.getPersonName();

        Transaction settlementTx = Transaction.builder()
                .title(title)
                .amount(dto.getAmount())
                .type(settlementTxType)
                .category("Udhar Settlement")
                .budgetCategory("Udhar")
                .date(dto.getDate())
                .description(dto.getDescription())
                .paymentSource(dto.getPaymentSource())
                .isUdhar(true)
                .user(user)
                .build();

        settlementTx = transactionRepository.save(settlementTx);

        // Link settlement to udhar record
        UdharTransactionLink link = UdharTransactionLink.builder()
                .udharRecord(record)
                .transaction(settlementTx)
                .transactionType(UdharTransactionLink.TransactionType.SETTLEMENT)
                .amount(dto.getAmount())
                .build();

        udharTransactionLinkRepository.save(link);

        // Update record
        BigDecimal newSettled = record.getSettledAmount().add(dto.getAmount());
        record.setSettledAmount(newSettled);

        if (newSettled.compareTo(record.getTotalAmount()) == 0) {
            record.setStatus(UdharStatus.SETTLED);
        } else if (newSettled.compareTo(BigDecimal.ZERO) > 0) {
            record.setStatus(UdharStatus.PARTIAL);
        }

        return udharRecordRepository.save(record);
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
