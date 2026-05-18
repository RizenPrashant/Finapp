/*
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
package com.finapp.controller;

import com.finapp.dto.CashbackEntryDTO;
import com.finapp.dto.CashbackWalletDTO;
import com.finapp.model.CashbackEntry;
import com.finapp.model.CashbackWallet;
import com.finapp.model.User;
import com.finapp.repository.UserRepository;
import com.finapp.service.CashbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cashback")
@RequiredArgsConstructor
public class CashbackController {

    private final CashbackService cashbackService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/wallets")
    public List<CashbackWallet> getWallets() {
        return cashbackService.getWallets(getCurrentUser());
    }

    @PostMapping("/wallets")
    public ResponseEntity<CashbackWallet> createWallet(@Valid @RequestBody CashbackWalletDTO dto) {
        return ResponseEntity.ok(cashbackService.createWallet(dto, getCurrentUser()));
    }

    @DeleteMapping("/wallets/{id}")
    public ResponseEntity<Void> deleteWallet(@PathVariable Long id) {
        cashbackService.deleteWallet(id, getCurrentUser());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/wallets/{id}")
    public ResponseEntity<CashbackWallet> updateWallet(@PathVariable Long id, @Valid @RequestBody CashbackWalletDTO dto) {
        return ResponseEntity.ok(cashbackService.updateWallet(id, dto, getCurrentUser()));
    }

    @GetMapping("/entries")
    public List<CashbackEntry> getEntries() {
        return cashbackService.getEntries(getCurrentUser());
    }

    @GetMapping("/entries/wallet/{walletId}")
    public List<CashbackEntry> getEntriesByWallet(@PathVariable Long walletId) {
        return cashbackService.getEntriesByWallet(walletId, getCurrentUser());
    }

    @PostMapping("/entries")
    public ResponseEntity<CashbackEntry> addEntry(@Valid @RequestBody CashbackEntryDTO dto) {
        return ResponseEntity.ok(cashbackService.addEntry(dto, getCurrentUser()));
    }

    @DeleteMapping("/entries/{id}")
    public ResponseEntity<Void> deleteEntry(@PathVariable Long id) {
        cashbackService.deleteEntry(id, getCurrentUser());
        return ResponseEntity.noContent().build();
    }
}
