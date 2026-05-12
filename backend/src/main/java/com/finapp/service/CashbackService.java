package com.finapp.service;

import com.finapp.dto.CashbackEntryDTO;
import com.finapp.dto.CashbackWalletDTO;
import com.finapp.model.CashbackEntry;
import com.finapp.model.CashbackEntry.CashbackType;
import com.finapp.model.CashbackWallet;
import com.finapp.model.User;
import com.finapp.repository.CashbackEntryRepository;
import com.finapp.repository.CashbackWalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CashbackService {

    private final CashbackWalletRepository walletRepository;
    private final CashbackEntryRepository entryRepository;

    public List<CashbackWallet> getWallets(User user) {
        return walletRepository.findByUserOrderByPlatformAsc(user);
    }

    public CashbackWallet createWallet(CashbackWalletDTO dto, User user) {
        CashbackWallet wallet = CashbackWallet.builder()
                .platform(dto.getPlatform())
                .icon(dto.getIcon())
                .color(dto.getColor())
                .balance(BigDecimal.ZERO)
                .totalEarned(BigDecimal.ZERO)
                .totalRedeemed(BigDecimal.ZERO)
                .user(user)
                .build();
        return walletRepository.save(wallet);
    }

    public void deleteWallet(Long id, User user) {
        CashbackWallet wallet = walletRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Wallet not found: " + id));
        walletRepository.delete(wallet);
    }

    public List<CashbackEntry> getEntries(User user) {
        return entryRepository.findByUserOrderByDateDesc(user);
    }

    public List<CashbackEntry> getEntriesByWallet(Long walletId, User user) {
        CashbackWallet wallet = walletRepository.findByIdAndUser(walletId, user)
                .orElseThrow(() -> new RuntimeException("Wallet not found: " + walletId));
        return entryRepository.findByWalletOrderByDateDesc(wallet);
    }

    @Transactional
    public CashbackEntry addEntry(CashbackEntryDTO dto, User user) {
        CashbackWallet wallet = walletRepository.findByIdAndUser(dto.getWalletId(), user)
                .orElseThrow(() -> new RuntimeException("Wallet not found: " + dto.getWalletId()));

        CashbackEntry entry = CashbackEntry.builder()
                .amount(dto.getAmount())
                .type(dto.getType())
                .description(dto.getDescription())
                .source(dto.getSource())
                .date(dto.getDate())
                .wallet(wallet)
                .user(user)
                .build();

        if (dto.getType() == CashbackType.EARNED) {
            wallet.setBalance(wallet.getBalance().add(dto.getAmount()));
            wallet.setTotalEarned(wallet.getTotalEarned().add(dto.getAmount()));
        } else {
            if (wallet.getBalance().compareTo(dto.getAmount()) < 0) {
                throw new RuntimeException("Insufficient cashback balance");
            }
            wallet.setBalance(wallet.getBalance().subtract(dto.getAmount()));
            wallet.setTotalRedeemed(wallet.getTotalRedeemed().add(dto.getAmount()));
        }

        walletRepository.save(wallet);
        return entryRepository.save(entry);
    }

    @Transactional
    public void deleteEntry(Long id, User user) {
        CashbackEntry entry = entryRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Entry not found: " + id));

        CashbackWallet wallet = entry.getWallet();
        if (entry.getType() == CashbackType.EARNED) {
            wallet.setBalance(wallet.getBalance().subtract(entry.getAmount()));
            wallet.setTotalEarned(wallet.getTotalEarned().subtract(entry.getAmount()));
        } else {
            wallet.setBalance(wallet.getBalance().add(entry.getAmount()));
            wallet.setTotalRedeemed(wallet.getTotalRedeemed().subtract(entry.getAmount()));
        }

        walletRepository.save(wallet);
        entryRepository.delete(entry);
    }
}
