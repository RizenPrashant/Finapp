package com.finapp.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UdharSettlementDTO {
    @NotNull
    private Long udharRecordId;

    @NotNull
    @Positive
    private BigDecimal amount;

    private String description;

    private LocalDate date;

    private String paymentSource;
}
