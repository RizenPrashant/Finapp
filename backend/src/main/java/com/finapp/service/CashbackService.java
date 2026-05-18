/*
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
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
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CashbackService {

    private final CashbackWalletRepository walletRepository;
    private final CashbackEntryRepository entryRepository;

    public List<CashbackWallet> getWallets(User user) {
        return walletRepository.findByUserOrderByPlatformAsc(user);
    }

    public CashbackWallet createWallet(CashbackWalletDTO dto, User user) {
        String logoUrl = dto.getLogoUrl() != null ? dto.getLogoUrl() : getLogoUrlForPlatform(dto.getPlatform());
        CashbackWallet wallet = CashbackWallet.builder()
                .platform(dto.getPlatform())
                .icon(dto.getIcon())
                .color(dto.getColor())
                .logoUrl(logoUrl)
                .balance(BigDecimal.ZERO)
                .totalEarned(BigDecimal.ZERO)
                .totalRedeemed(BigDecimal.ZERO)
                .user(user)
                .build();
        return walletRepository.save(wallet);
    }

    private String getLogoUrlForPlatform(String platform) {
        String lower = platform.toLowerCase().replace(" ", "").replace("pay", "");
        // Map of platform names to SimpleIcons CDN
        Map<String, String> logoMap = new java.util.HashMap<>();
        logoMap.put("swiggy", "https://cdn.simpleicons.org/swiggy/FC8019");
        logoMap.put("amazon", "https://cdn.simpleicons.org/amazon/FF9900");
        logoMap.put("amazonpay", "https://cdn.simpleicons.org/amazon/FF9900");
        logoMap.put("phonepe", "https://cdn.simpleicons.org/phonepe/5F259F");
        logoMap.put("googlepay", "https://cdn.simpleicons.org/googlepay/4285F4");
        logoMap.put("gpay", "https://cdn.simpleicons.org/googlepay/4285F4");
        logoMap.put("paytm", "https://cdn.simpleicons.org/paytm/00BAF2");
        logoMap.put("cred", "https://cdn.simpleicons.org/cred/D9534F");
        logoMap.put("flipkart", "https://cdn.simpleicons.org/flipkart/2874F0");
        logoMap.put("zomato", "https://cdn.simpleicons.org/zomato/E23744");
        logoMap.put("myntra", "https://cdn.simpleicons.org/myntra/FF0055");
        logoMap.put("uber", "https://cdn.simpleicons.org/uber/276EF7");
        logoMap.put("hdfccard", "https://cdn.simpleicons.org/hdfcbank/004C97");
        logoMap.put("sbicard", "https://cdn.simpleicons.org/sbi/22409A");
        logoMap.put("axiscard", "https://cdn.simpleicons.org/axisbank/97144D");
        logoMap.put("mobikwik", "https://cdn.simpleicons.org/mobikwik/1ED760");

        for (Map.Entry<String, String> entry : logoMap.entrySet()) {
            if (lower.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null; // No auto logo found
    }

    public void deleteWallet(Long id, User user) {
        CashbackWallet wallet = walletRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Wallet not found: " + id));
        walletRepository.delete(wallet);
    }

    public CashbackWallet updateWallet(Long id, CashbackWalletDTO dto, User user) {
        CashbackWallet wallet = walletRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Wallet not found: " + id));
        wallet.setPlatform(dto.getPlatform());
        wallet.setIcon(dto.getIcon());
        wallet.setColor(dto.getColor());
        // Update logo URL if provided or auto-detect if platform changed
        if (dto.getLogoUrl() != null) {
            wallet.setLogoUrl(dto.getLogoUrl());
        } else if (!wallet.getPlatform().equalsIgnoreCase(dto.getPlatform())) {
            wallet.setLogoUrl(getLogoUrlForPlatform(dto.getPlatform()));
        }
        return walletRepository.save(wallet);
    }

    public List<CashbackEntry> getEntries(User user) {
        return entryRepository.findByUserOrderByDateDesc(user);
    }

    public BigDecimal getTotalEarned(User user) {
        return walletRepository.findByUserOrderByPlatformAsc(user).stream()
                .map(CashbackWallet::getTotalEarned)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal getTotalRedeemed(User user) {
        return walletRepository.findByUserOrderByPlatformAsc(user).stream()
                .map(CashbackWallet::getTotalRedeemed)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
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
