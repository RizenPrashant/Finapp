package com.finapp.service;

import com.finapp.dto.TradeAnalyticsDTO;
import com.finapp.dto.TradeDTO;
import com.finapp.dto.CompoundingHistoryDTO;
import com.finapp.model.Trade;
import com.finapp.model.CompoundingHistory;
import com.finapp.model.TradeSegment;
import com.finapp.model.TradeStatus;
import com.finapp.model.User;
import com.finapp.repository.TradeRepository;
import com.finapp.repository.CompoundingHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TradingService {

    private final TradeRepository tradeRepository;
    private final CompoundingHistoryRepository compoundingHistoryRepository;

    // ========== Trade CRUD ==========

    public List<Trade> getAllTrades(User user) {
        List<Trade> trades = tradeRepository.findByUser(user);
        if (trades.isEmpty()) {
            List<Trade> orphanTrades = tradeRepository.findByUserIsNull();
            if (!orphanTrades.isEmpty()) {
                orphanTrades.forEach(t -> t.setUser(user));
                tradeRepository.saveAll(orphanTrades);
                trades = tradeRepository.findByUser(user);
            }
        }
        return trades;
    }

    public List<Trade> getTradesByStatus(User user, TradeStatus status) {
        return tradeRepository.findByUserAndStatus(user, status);
    }

    public List<Trade> getTradesBySegment(User user, TradeSegment segment) {
        return tradeRepository.findByUserAndSegment(user, segment);
    }

    public Trade createTrade(TradeDTO dto, User user) {
        Trade trade = Trade.builder()
                .stockName(dto.getStockName())
                .segment(dto.getSegment())
                .tradeType(dto.getTradeType())
                .positionType(dto.getPositionType())
                .quantity(dto.getQuantity())
                .buyPrice(dto.getBuyPrice())
                .sellPrice(dto.getSellPrice())
                .investedAmount(dto.getInvestedAmount())
                .returnAmount(dto.getReturnAmount())
                .profitLoss(dto.getProfitLoss())
                .profitLossPercentage(dto.getProfitLossPercentage())
                .brokerage(dto.getBrokerage())
                .status(dto.getStatus())
                .entryDate(dto.getEntryDate())
                .exitDate(dto.getExitDate())
                .notes(dto.getNotes())
                .user(user)
                .build();
        return tradeRepository.save(trade);
    }

    public Trade updateTrade(Long id, TradeDTO dto, User user) {
        Trade existing = tradeRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Trade not found: " + id));
        
        existing.setStockName(dto.getStockName());
        existing.setSegment(dto.getSegment());
        existing.setTradeType(dto.getTradeType());
        existing.setPositionType(dto.getPositionType());
        existing.setQuantity(dto.getQuantity());
        existing.setBuyPrice(dto.getBuyPrice());
        existing.setSellPrice(dto.getSellPrice());
        existing.setInvestedAmount(dto.getInvestedAmount());
        existing.setReturnAmount(dto.getReturnAmount());
        existing.setProfitLoss(dto.getProfitLoss());
        existing.setProfitLossPercentage(dto.getProfitLossPercentage());
        existing.setBrokerage(dto.getBrokerage());
        existing.setStatus(dto.getStatus());
        existing.setEntryDate(dto.getEntryDate());
        existing.setExitDate(dto.getExitDate());
        existing.setNotes(dto.getNotes());
        
        return tradeRepository.save(existing);
    }

    public void deleteTrade(Long id, User user) {
        Trade trade = tradeRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Trade not found: " + id));
        tradeRepository.delete(trade);
    }

    // Calculate trade metrics dynamically
    public void calculateTradeMetrics(Trade trade) {
        BigDecimal quantity = new BigDecimal(trade.getQuantity());
        BigDecimal invested = trade.getBuyPrice().multiply(quantity);
        trade.setInvestedAmount(invested);

        if (trade.getSellPrice() != null && trade.getStatus() == TradeStatus.CLOSED) {
            BigDecimal returns = trade.getSellPrice().multiply(quantity);
            trade.setReturnAmount(returns);
            
            BigDecimal pnl = returns.subtract(invested).subtract(trade.getBrokerage());
            trade.setProfitLoss(pnl);
            
            BigDecimal pnlPercentage = invested.compareTo(BigDecimal.ZERO) > 0 
                ? pnl.divide(invested, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"))
                : BigDecimal.ZERO;
            trade.setProfitLossPercentage(pnlPercentage);
        }
    }

    // ========== Analytics ==========

    public TradeAnalyticsDTO getAnalytics(User user) {
        Long totalTrades = tradeRepository.countByUser(user);
        Long winningTrades = tradeRepository.countWinningTradesByUser(user);
        Long losingTrades = tradeRepository.countLosingTradesByUser(user);
        
        BigDecimal winRate = totalTrades > 0 
            ? new BigDecimal(winningTrades).divide(new BigDecimal(totalTrades), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"))
            : BigDecimal.ZERO;
        
        BigDecimal totalProfit = tradeRepository.sumProfitsByUser(user);
        BigDecimal totalLoss = tradeRepository.sumLossesByUser(user);
        BigDecimal netPnL = tradeRepository.sumNetPnLByUser(user);
        
        BigDecimal avgReturn = totalTrades > 0 
            ? netPnL.divide(new BigDecimal(totalTrades), 4, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;
        
        BigDecimal largestProfit = tradeRepository.findLargestProfitByUser(user);
        BigDecimal largestLoss = tradeRepository.findLargestLossByUser(user);
        
        Long openPositions = tradeRepository.findByUserAndStatus(user, TradeStatus.OPEN).stream().count();
        BigDecimal totalCapitalUsed = tradeRepository.sumInvestedAmountByUser(user);
        
        BigDecimal realizedPnL = tradeRepository.sumRealizedPnLByUser(user);
        BigDecimal unrealizedPnL = tradeRepository.sumUnrealizedPnLByUser(user);

        // Segment-wise analytics
        Map<String, TradeAnalyticsDTO.SegmentAnalytics> segmentAnalytics = getSegmentAnalytics(user);

        // Monthly PnL
        Map<String, BigDecimal> monthlyPnL = getMonthlyPnL(user);

        return TradeAnalyticsDTO.builder()
                .totalTrades(totalTrades)
                .winningTrades(winningTrades)
                .losingTrades(losingTrades)
                .winRate(winRate)
                .totalProfit(totalProfit)
                .totalLoss(totalLoss)
                .netPnL(netPnL)
                .avgReturnPercentage(avgReturn)
                .largestProfit(largestProfit)
                .largestLoss(largestLoss)
                .openPositions(openPositions)
                .totalCapitalUsed(totalCapitalUsed)
                .realizedPnL(realizedPnL)
                .unrealizedPnL(unrealizedPnL)
                .segmentAnalytics(segmentAnalytics)
                .monthlyPnL(monthlyPnL)
                .build();
    }

    private Map<String, TradeAnalyticsDTO.SegmentAnalytics> getSegmentAnalytics(User user) {
        List<Object[]> results = tradeRepository.getSegmentAnalyticsByUser(user);
        Map<String, TradeAnalyticsDTO.SegmentAnalytics> analytics = new HashMap<>();

        for (Object[] row : results) {
            TradeSegment segment = (TradeSegment) row[0];
            Long count = (Long) row[1];
            BigDecimal netPnL = toBigDecimal(row[2]);
            BigDecimal avgReturn = toBigDecimal(row[3]);

            analytics.put(segment.name(), TradeAnalyticsDTO.SegmentAnalytics.builder()
                    .totalTrades(count)
                    .netPnL(netPnL != null ? netPnL : BigDecimal.ZERO)
                    .avgReturn(avgReturn != null ? avgReturn : BigDecimal.ZERO)
                    .build());
        }

        return analytics;
    }

    private Map<String, BigDecimal> getMonthlyPnL(User user) {
        List<Object[]> results = tradeRepository.getMonthlyPnLByUser(user);
        Map<String, BigDecimal> monthlyPnL = new HashMap<>();

        for (Object[] row : results) {
            String month = (String) row[0];
            BigDecimal pnl = toBigDecimal(row[1]);
            monthlyPnL.put(month, pnl != null ? pnl : BigDecimal.ZERO);
        }

        return monthlyPnL;
    }

    // ========== Compounding History ==========

    public List<CompoundingHistory> getCompoundingHistory(User user) {
        List<CompoundingHistory> history = compoundingHistoryRepository.findByUser(user);
        if (history.isEmpty()) {
            List<CompoundingHistory> orphanHistory = compoundingHistoryRepository.findByUserIsNull();
            if (!orphanHistory.isEmpty()) {
                orphanHistory.forEach(h -> h.setUser(user));
                compoundingHistoryRepository.saveAll(orphanHistory);
                history = compoundingHistoryRepository.findByUser(user);
            }
        }
        return history;
    }

    public CompoundingHistory createCompoundingHistory(CompoundingHistoryDTO dto, User user) {
        BigDecimal profit = dto.getEndingCapital().subtract(dto.getStartingCapital());
        
        CompoundingHistory history = CompoundingHistory.builder()
                .startingCapital(dto.getStartingCapital())
                .endingCapital(dto.getEndingCapital())
                .profit(profit)
                .reinvested(dto.getReinvested())
                .month(dto.getMonth())
                .year(dto.getYear())
                .user(user)
                .build();
        return compoundingHistoryRepository.save(history);
    }

    public void deleteCompoundingHistory(Long id, User user) {
        CompoundingHistory history = compoundingHistoryRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Compounding history not found: " + id));
        compoundingHistoryRepository.delete(history);
    }

    public BigDecimal getCurrentCapital(User user) {
        List<BigDecimal> latestCapital = compoundingHistoryRepository.findLatestCapitalByUser(user);
        return latestCapital.isEmpty() ? BigDecimal.ZERO : latestCapital.get(0);
    }

    // Helper method to safely convert Double/BigDecimal to BigDecimal
    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }
        if (value instanceof Double) {
            return BigDecimal.valueOf((Double) value);
        }
        if (value instanceof Number) {
            return BigDecimal.valueOf(((Number) value).doubleValue());
        }
        return null;
    }
}
