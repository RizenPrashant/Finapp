package com.finapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockHoldingsDTO {
    
    private String stockName;
    private String segment;
    private Integer totalQuantity;
    private BigDecimal averageBuyPrice;
    private BigDecimal totalInvested;
    private BigDecimal currentValue;
    private BigDecimal unrealizedPnl;
    private BigDecimal unrealizedPnlPercentage;
    private Integer totalTrades;
    private Integer openTrades;
    private Integer closedTrades;
    private List<TradeDetail> trades;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TradeDetail {
        private Long tradeId;
        private Integer quantity;
        private BigDecimal buyPrice;
        private BigDecimal sellPrice;
        private BigDecimal investedAmount;
        private BigDecimal returnAmount;
        private BigDecimal profitLoss;
        private String status;
        private String entryDate;
        private String exitDate;
        private String broker;
        private String notes;
    }
}
