package com.finapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradeAnalyticsDTO {

    private Long totalTrades;
    private Long winningTrades;
    private Long losingTrades;
    private BigDecimal winRate;
    private BigDecimal totalProfit;
    private BigDecimal totalLoss;
    private BigDecimal netPnL;
    private BigDecimal avgReturnPercentage;
    private BigDecimal largestProfit;
    private BigDecimal largestLoss;
    private Long openPositions;
    private BigDecimal totalCapitalUsed;
    private BigDecimal realizedPnL;
    private BigDecimal unrealizedPnL;

    // Segment-wise breakdown
    private Map<String, SegmentAnalytics> segmentAnalytics;

    // Monthly PnL
    private Map<String, BigDecimal> monthlyPnL;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SegmentAnalytics {
        private Long totalTrades;
        private Long winningTrades;
        private Long losingTrades;
        private BigDecimal winRate;
        private BigDecimal netPnL;
        private BigDecimal avgReturn;
    }
}
