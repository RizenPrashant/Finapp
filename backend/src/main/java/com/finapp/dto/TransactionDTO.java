package com.finapp.dto;

import com.finapp.model.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class TransactionDTO {

    @NotBlank(message = "Title is required")
    private String title;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private BigDecimal amount;

    @NotNull(message = "Type is required")
    private TransactionType type;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Budget category is required")
    private String budgetCategory;

    @NotNull(message = "Date is required")
    private LocalDate date;

    private String description;

    private String paymentSource;

    private String referenceNumber;

    private BigDecimal balanceAfter;

    // Udhar fields
    private Boolean isUdhar;
    private String udharPersonName;
    private String udharMobileNumber;
    private String udharType; // GIVEN or TAKEN
}
