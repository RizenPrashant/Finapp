package com.finapp.dto;

import com.finapp.model.AssetCategory;
import com.finapp.model.AssetType;
import com.finapp.model.InvestmentSubCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class AssetDTO {

    @NotBlank(message = "Name is required")
    private String name;

    // Zero is a legitimate starting value — a credit card with nothing owed on
    // it, or an account opened empty. @Positive rejected both.
    @NotNull(message = "Value is required")
    @PositiveOrZero(message = "Value cannot be negative")
    private BigDecimal value;

    @NotNull(message = "Type is required")
    private AssetType type;

    @NotNull(message = "Category is required")
    private AssetCategory category;

    private InvestmentSubCategory subCategory;

    private LocalDate date;
    private String description;
    private Boolean hasTransactions;
    private BigDecimal creditLimit; // For credit cards, overdraft limits
}
