package com.finapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "assets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Asset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    @NotNull
    @Column(name = "asset_value")
    private BigDecimal value;

    @NotNull
    @Column(columnDefinition = "VARCHAR(20)")
    private AssetType type; // ASSET, LIABILITY, DEBT, INVESTMENT

    @NotNull
    @Column(columnDefinition = "VARCHAR(30)")
    private AssetCategory category; // CASH, BANK, GOLD, PROPERTY, VEHICLES, INVESTMENTS, OTHER

    @Column(columnDefinition = "VARCHAR(30)")
    private InvestmentSubCategory subCategory; // For INVESTMENTS: STOCKS, MUTUAL_FUNDS, etc.

    private LocalDate date;
    private String description;

    @Column(name = "has_transactions", nullable = false)
    @Builder.Default
    private Boolean hasTransactions = false;

    @Column(name = "credit_limit", precision = 15, scale = 2)
    private BigDecimal creditLimit; // For CREDIT_CARD: max allowed limit

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"transactions", "assets", "budgets", "password"})
    private User user;
}
