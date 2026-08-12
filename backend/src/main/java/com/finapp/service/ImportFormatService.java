/*
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
package com.finapp.service;

import com.finapp.model.Asset;
import com.finapp.model.ImportFormat;
import com.finapp.model.User;
import com.finapp.repository.AssetRepository;
import com.finapp.repository.ImportFormatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ImportFormatService {

    private final ImportFormatRepository importFormatRepository;
    private final AssetRepository assetRepository;

    // Get all available formats (system defaults + user's custom)
    public List<ImportFormat> getAllFormats(User user) {
        return importFormatRepository.findByUserIsNullOrUser(user);
    }

    // Get formats by type
    public List<ImportFormat> getFormatsByType(String type, User user) {
        return importFormatRepository.findByUserIsNullOrUser(user)
                .stream()
                .filter(f -> f.getType().equalsIgnoreCase(type))
                .toList();
    }

    // Get bank formats (linked to assets)
    public List<ImportFormat> getBankFormats(User user) {
        return getFormatsByType("BANK", user);
    }

    // Get broker formats
    public List<ImportFormat> getBrokerFormats(User user) {
        return getFormatsByType("BROKER", user);
    }

    // Get credit card formats
    public List<ImportFormat> getCreditCardFormats(User user) {
        return getFormatsByType("CREDIT_CARD", user);
    }

    // Get single format by ID
    public Optional<ImportFormat> getFormatById(Long id, User user) {
        return importFormatRepository.findById(id)
                .filter(f -> f.getUser() == null || f.getUser().getId().equals(user.getId()));
    }

    // Create custom format
    @Transactional
    public ImportFormat createFormat(ImportFormat format, User user) {
        // Check for duplicate name
        if (importFormatRepository.existsByNameAndUser(format.getName(), user)) {
            throw new RuntimeException("Format with name '" + format.getName() + "' already exists");
        }

        format.setUser(user);
        format.setIsDefault(false);
        format.setIsSystem(false);

        // Link to asset if assetId provided
        if (format.getLinkedAsset() != null && format.getLinkedAsset().getId() != null) {
            Asset asset = assetRepository.findByIdAndUser(format.getLinkedAsset().getId(), user)
                    .orElseThrow(() -> new RuntimeException("Linked asset not found"));
            format.setLinkedAsset(asset);
        }

        return importFormatRepository.save(format);
    }

    // Update custom format
    @Transactional
    public ImportFormat updateFormat(Long id, ImportFormat updated, User user) {
        ImportFormat existing = importFormatRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Format not found"));

        // Cannot modify system formats
        if (existing.getIsSystem()) {
            throw new RuntimeException("Cannot modify system default formats");
        }

        // Can only modify own formats
        if (existing.getUser() != null && !existing.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to modify this format");
        }

        // Update fields
        existing.setName(updated.getName());
        existing.setType(updated.getType());
        existing.setDateColumn(updated.getDateColumn());
        existing.setDescriptionColumn(updated.getDescriptionColumn());
        existing.setDebitColumn(updated.getDebitColumn());
        existing.setCreditColumn(updated.getCreditColumn());
        existing.setAmountColumn(updated.getAmountColumn());
        existing.setBalanceColumn(updated.getBalanceColumn());
        existing.setSkipRows(updated.getSkipRows());
        existing.setDateFormat(updated.getDateFormat());
        existing.setFileType(updated.getFileType());

        // Update linked asset
        if (updated.getLinkedAsset() != null && updated.getLinkedAsset().getId() != null) {
            Asset asset = assetRepository.findByIdAndUser(updated.getLinkedAsset().getId(), user)
                    .orElseThrow(() -> new RuntimeException("Linked asset not found"));
            existing.setLinkedAsset(asset);
        } else {
            existing.setLinkedAsset(null);
        }

        return importFormatRepository.save(existing);
    }

    // Delete custom format
    @Transactional
    public void deleteFormat(Long id, User user) {
        ImportFormat format = importFormatRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Format not found"));

        // Cannot delete system formats
        if (format.getIsSystem()) {
            throw new RuntimeException("Cannot delete system default formats");
        }

        // Can only delete own formats
        if (format.getUser() != null && !format.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to delete this format");
        }

        importFormatRepository.delete(format);
    }

    // Initialize system default formats (called on startup) — always upserts so fixes propagate
    @Transactional
    public void initializeDefaultFormats() {
        createSystemDefaults();
    }

    private void upsertSystem(ImportFormat format) {
        importFormatRepository.findByNameAndUserIsNull(format.getName())
                .ifPresentOrElse(existing -> {
                    existing.setType(format.getType());
                    existing.setDateColumn(format.getDateColumn());
                    existing.setDescriptionColumn(format.getDescriptionColumn());
                    existing.setDebitColumn(format.getDebitColumn());
                    existing.setCreditColumn(format.getCreditColumn());
                    existing.setAmountColumn(format.getAmountColumn());
                    existing.setBalanceColumn(format.getBalanceColumn());
                    existing.setSkipRows(format.getSkipRows());
                    existing.setDateFormat(format.getDateFormat());
                    existing.setFileType(format.getFileType());
                    importFormatRepository.save(existing);
                }, () -> importFormatRepository.save(format));
    }

    private void createSystemDefaults() {
        // ICICI Bank - Based on actual XLS export format
        // Cols: 0=Empty, 1=S.No, 2=Value Date(dd.MM.yyyy), 3=Transaction Date, 4=Cheque No, 5=Transaction Remarks, 6=Withdrawal Amount(INR), 7=Deposit Amount(INR), 8=Balance
        ImportFormat icici = ImportFormat.builder()
                .name("ICICI Bank")
                .type("BANK")
                .dateColumn("Value Date")
                .descriptionColumn("Transaction Remarks")
                .debitColumn("Withdrawal Amount(INR)")
                .creditColumn("Deposit Amount(INR)")
                .balanceColumn("Balance")
                .skipRows(0)
                .dateFormat("dd.MM.yyyy")
                .fileType("excel")
                .isDefault(true)
                .isSystem(true)
                .build();
        upsertSystem(icici);

        // HDFC Bank
        ImportFormat hdfc = ImportFormat.builder()
                .name("HDFC Bank")
                .type("BANK")
                .dateColumn("Date")
                .descriptionColumn("Narration")
                .debitColumn("Withdrawal Amt")
                .creditColumn("Deposit Amt")
                .balanceColumn("Closing Balance")
                .skipRows(1)
                .dateFormat("dd/MM/yyyy")
                .fileType("csv")
                .isDefault(true)
                .isSystem(true)
                .build();
        upsertSystem(hdfc);

        // SBI Bank
        ImportFormat sbi = ImportFormat.builder()
                .name("SBI Bank")
                .type("BANK")
                .dateColumn("Txn Date")
                .descriptionColumn("Description")
                .debitColumn("Debit")
                .creditColumn("Credit")
                .balanceColumn("Balance")
                .skipRows(1)
                .dateFormat("dd-MM-yyyy")
                .fileType("csv")
                .isDefault(true)
                .isSystem(true)
                .build();
        upsertSystem(sbi);

        // Generic CSV
        ImportFormat generic = ImportFormat.builder()
                .name("Generic CSV")
                .type("BANK")
                .dateColumn("Date")
                .descriptionColumn("Description")
                .debitColumn("Debit")
                .creditColumn("Credit")
                .balanceColumn("Balance")
                .skipRows(1)
                .dateFormat("dd-MM-yyyy")
                .fileType("csv")
                .isDefault(true)
                .isSystem(true)
                .build();
        upsertSystem(generic);

        // Zerodha Trades
        ImportFormat zerodha = ImportFormat.builder()
                .name("Zerodha")
                .type("BROKER")
                .symbolColumn("Symbol")
                .tradeTypeColumn("Type")
                .quantityColumn("Quantity")
                .priceColumn("Price")
                .tradeDateColumn("Date")
                .skipRows(1)
                .dateFormat("dd-MM-yyyy")
                .fileType("csv")
                .isDefault(true)
                .isSystem(true)
                .build();
        upsertSystem(zerodha);

        // ── Credit Card Formats ──────────────────────────────────────────────

        ImportFormat hdfcCC = ImportFormat.builder()
                .name("HDFC Credit Card")
                .type("CREDIT_CARD")
                .dateColumn("Date")
                .descriptionColumn("Description")
                .amountColumn("Amount")
                .debitIndicator("Dr")
                .creditIndicator("Cr")
                .skipRows(0)
                .dateFormat("dd/MM/yyyy")
                .fileType("pdf")
                .isDefault(true)
                .isSystem(true)
                .build();
        upsertSystem(hdfcCC);

        ImportFormat sbiCard = ImportFormat.builder()
                .name("SBI Card")
                .type("CREDIT_CARD")
                .dateColumn("Date")
                .descriptionColumn("Description")
                .amountColumn("Amount")
                .skipRows(0)
                .dateFormat("dd MMM yyyy")
                .fileType("pdf")
                .isDefault(true)
                .isSystem(true)
                .build();
        upsertSystem(sbiCard);

        ImportFormat axisCC = ImportFormat.builder()
                .name("Axis Bank Credit Card")
                .type("CREDIT_CARD")
                .dateColumn("Date")
                .descriptionColumn("Description")
                .amountColumn("Amount")
                .debitIndicator("Dr")
                .creditIndicator("Cr")
                .skipRows(0)
                .dateFormat("dd-MM-yyyy")
                .fileType("pdf")
                .isDefault(true)
                .isSystem(true)
                .build();
        upsertSystem(axisCC);

        ImportFormat iciciCC = ImportFormat.builder()
                .name("ICICI Credit Card")
                .type("CREDIT_CARD")
                .dateColumn("Date")
                .descriptionColumn("Description")
                .amountColumn("Amount")
                .debitIndicator("Dr")
                .creditIndicator("Cr")
                .skipRows(0)
                .dateFormat("dd/MM/yyyy")
                .fileType("pdf")
                .isDefault(true)
                .isSystem(true)
                .build();
        upsertSystem(iciciCC);

        ImportFormat amex = ImportFormat.builder()
                .name("Amex (American Express)")
                .type("CREDIT_CARD")
                .dateColumn("Date")
                .descriptionColumn("Description")
                .amountColumn("Amount")
                .skipRows(0)
                .dateFormat("dd MMM yyyy")
                .fileType("pdf")
                .isDefault(true)
                .isSystem(true)
                .build();
        upsertSystem(amex);
    }
}
