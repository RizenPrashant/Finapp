package com.finapp.dto;

import com.finapp.model.CashbackEntry.CashbackType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CashbackEntryDTO {
    @NotNull
    private Long walletId;

    @NotNull
    @Positive
    private BigDecimal amount;

    @NotNull
    private CashbackType type;

    @NotBlank
    private String description;

    private String source;

    @NotNull
    private LocalDate date;

    private Long transactionId;
}
