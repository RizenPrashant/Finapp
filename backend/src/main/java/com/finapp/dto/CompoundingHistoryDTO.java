package com.finapp.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CompoundingHistoryDTO {

    private Long id;

    @NotNull
    @Positive
    private BigDecimal startingCapital;

    @NotNull
    @Positive
    private BigDecimal endingCapital;

    @NotNull
    private Boolean reinvested;

    @NotNull
    private String month;

    @NotNull
    private Integer year;
}
