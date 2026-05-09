package com.finapp.dto;

import com.finapp.model.TradeSegment;
import com.finapp.model.TradeStatus;
import com.finapp.model.Trade.TradeType;
import com.finapp.model.Trade.PositionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class TradeDTO {

    private Long id;

    @NotBlank
    private String stockName;

    @NotNull
    private TradeSegment segment;

    @NotNull
    private TradeType tradeType;

    @NotNull
    private PositionType positionType;

    @NotNull
    @Positive
    private Integer quantity;

    @NotNull
    @Positive
    private BigDecimal buyPrice;

    private BigDecimal sellPrice;

    @NotNull
    @Positive
    private BigDecimal investedAmount;

    private BigDecimal returnAmount;

    private BigDecimal profitLoss;

    private BigDecimal profitLossPercentage;

    @NotNull
    @Positive
    private BigDecimal brokerage;

    @NotNull
    private TradeStatus status;

    @NotNull
    private LocalDate entryDate;

    private LocalDate exitDate;

    private String notes;
}
