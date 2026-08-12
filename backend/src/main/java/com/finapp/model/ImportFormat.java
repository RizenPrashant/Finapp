/*
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
package com.finapp.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "import_formats")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportFormat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name; // e.g., "ICICI Bank", "HDFC Credit Card"

    @NotBlank
    @Column(nullable = false)
    private String type; // "BANK" or "BROKER"

    // Link to existing asset (Bank/Credit Card) - this ensures transactions link to correct asset
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_asset_id")
    @JsonIgnoreProperties({"user", "transactions"})
    private Asset linkedAsset;

    // CSV/Excel column mapping configuration
    @Column(name = "date_column")
    private String dateColumn; // e.g., "Date", "Transaction Date"

    @Column(name = "description_column")
    private String descriptionColumn; // e.g., "Description", "Narration"

    @Column(name = "debit_column")
    private String debitColumn; // e.g., "Debit", "Withdrawal"

    @Column(name = "credit_column")
    private String creditColumn; // e.g., "Credit", "Deposit"

    @Column(name = "amount_column")
    private String amountColumn; // For single column amount (with +/-)

    @Column(name = "balance_column")
    private String balanceColumn; // e.g., "Balance", "Running Balance"

    @Column(name = "skip_rows")
    @Builder.Default
    private Integer skipRows = 1; // Header rows to skip

    @Column(name = "date_format")
    private String dateFormat; // e.g., "dd-MM-yyyy", "dd/MM/yyyy"

    // For trade/broker imports
    @Column(name = "symbol_column")
    private String symbolColumn;

    @Column(name = "quantity_column")
    private String quantityColumn;

    @Column(name = "price_column")
    private String priceColumn;

    @Column(name = "trade_type_column")
    private String tradeTypeColumn; // Buy/Sell

    @Column(name = "trade_date_column")
    private String tradeDateColumn;

    // Type indicators
    @Column(name = "debit_indicator")
    private String debitIndicator; // e.g., "DR", "Dr" — value in Dr/Cr column or suffix

    @Column(name = "credit_indicator")
    private String creditIndicator; // e.g., "CR", "Cr"

    // How to determine DEBIT vs CREDIT for CC PDFs:
    //   "SUFFIX"  — amount has CR suffix for credit, no suffix = debit (ICICI CC style)
    //   "COLUMN"  — separate Dr/Cr column exists (HDFC CC style)
    //   "SIGNED"  — negative amount = credit (some banks)
    //   null/blank — use narration keywords as fallback
    @Column(name = "type_indicator_mode")
    private String typeIndicatorMode;

    // Flags
    @Column(name = "is_default")
    @Builder.Default
    private Boolean isDefault = false; // System default, cannot delete

    @Column(name = "is_system")
    @Builder.Default
    private Boolean isSystem = false; // Built-in format (protected)

    @Column(name = "file_type")
    private String fileType; // csv, excel, pdf

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"transactions", "assets", "budgets", "password"})
    private User user; // Null for system defaults, set for user-created

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Helper method to get linked asset name
    public String getLinkedAssetName() {
        return linkedAsset != null ? linkedAsset.getName() : null;
    }

    // Helper method to get linked asset ID
    public Long getLinkedAssetId() {
        return linkedAsset != null ? linkedAsset.getId() : null;
    }
}
