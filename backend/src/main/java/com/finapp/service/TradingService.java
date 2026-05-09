package com.finapp.service;

import com.finapp.dto.TradeAnalyticsDTO;
import com.finapp.dto.TradeDTO;
import com.finapp.dto.CompoundingHistoryDTO;
import com.finapp.model.Asset;
import com.finapp.model.AssetCategory;
import com.finapp.model.AssetType;
import com.finapp.model.Trade;
import com.finapp.model.CompoundingHistory;
import com.finapp.model.TradeSegment;
import com.finapp.model.TradeStatus;
import com.finapp.model.User;
import com.finapp.repository.AssetRepository;
import com.finapp.repository.TradeRepository;
import com.finapp.repository.CompoundingHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TradingService {

    private final TradeRepository tradeRepository;
    private final CompoundingHistoryRepository compoundingHistoryRepository;
    private final AssetRepository assetRepository;

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

    public List<Trade> getTradesByBroker(User user, String broker) {
        return tradeRepository.findByUserAndBroker(user, broker);
    }

    public List<String> getBrokers(User user) {
        return tradeRepository.findDistinctBrokersByUser(user);
    }

    @Transactional
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
                .broker(dto.getBroker() != null ? dto.getBroker() : "ZERODHA")
                .user(user)
                .build();
        Trade savedTrade = tradeRepository.save(trade);

        // Auto-update trading capital in assets
        updateTradingCapitalAssets(savedTrade, user);

        return savedTrade;
    }

    @Transactional
    public Trade updateTrade(Long id, TradeDTO dto, User user) {
        Trade existing = tradeRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Trade not found: " + id));
        
        // Reverse old asset changes before updating
        reverseTradeAssetChanges(existing, user);
        
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
        existing.setBroker(dto.getBroker() != null ? dto.getBroker() : existing.getBroker());

        Trade savedTrade = tradeRepository.save(existing);
        
        // Apply new asset changes
        updateTradingCapitalAssets(savedTrade, user);

        return savedTrade;
    }

    public void deleteTrade(Long id, User user) {
        Trade trade = tradeRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Trade not found: " + id));
        // Reverse the asset changes before deleting
        reverseTradeAssetChanges(trade, user);
        tradeRepository.delete(trade);
    }

    // ========== Auto-update Trading Capital in Assets ==========

    @Transactional
    public void updateTradingCapitalAssets(Trade trade, User user) {
        String assetName = "Trading Capital";

        if (trade.getStatus() == TradeStatus.OPEN) {
            // For OPEN trades: Add invested amount to Trading Capital
            BigDecimal investedAmount = trade.getInvestedAmount() != null ? trade.getInvestedAmount() : 
                trade.getBuyPrice().multiply(new BigDecimal(trade.getQuantity()));
            
            // Add to main Trading Capital (total capital deployed) as INVESTMENT type
            adjustTradingCapital(assetName, investedAmount, AssetType.INVESTMENT, user);

        } else if (trade.getStatus() == TradeStatus.CLOSED) {
            // For CLOSED trades: Remove invested amount from capital and add return amount
            BigDecimal returnAmount = trade.getReturnAmount() != null ? trade.getReturnAmount() :
                trade.getSellPrice().multiply(new BigDecimal(trade.getQuantity()));
            BigDecimal investedAmount = trade.getInvestedAmount() != null ? trade.getInvestedAmount() :
                trade.getBuyPrice().multiply(new BigDecimal(trade.getQuantity()));
            
            // Remove invested amount from Trading Capital (capital freed up)
            adjustTradingCapital(assetName, investedAmount.negate(), AssetType.INVESTMENT, user);
            
            // Add return amount to Trading Capital (capital returned with profit)
            adjustTradingCapital(assetName, returnAmount, AssetType.INVESTMENT, user);
        }
    }

    @Transactional
    public void reverseTradeAssetChanges(Trade trade, User user) {
        String assetName = "Trading Capital";

        if (trade.getStatus() == TradeStatus.OPEN) {
            // Reverse OPEN trade: Deduct from Trading Capital
            BigDecimal investedAmount = trade.getInvestedAmount() != null ? trade.getInvestedAmount() : 
                trade.getBuyPrice().multiply(new BigDecimal(trade.getQuantity()));
            adjustTradingCapital(assetName, investedAmount.negate(), AssetType.INVESTMENT, user);
            
        } else if (trade.getStatus() == TradeStatus.CLOSED) {
            // Reverse CLOSED trade: Reverse the changes
            BigDecimal returnAmount = trade.getReturnAmount() != null ? trade.getReturnAmount() : BigDecimal.ZERO;
            BigDecimal investedAmount = trade.getInvestedAmount() != null ? trade.getInvestedAmount() :
                trade.getBuyPrice().multiply(new BigDecimal(trade.getQuantity()));
            
            // Re-add the invested amount (as if trade is open again)
            adjustTradingCapital(assetName, investedAmount, AssetType.INVESTMENT, user);
            // Remove the return amount (reverse the sell)
            adjustTradingCapital(assetName, returnAmount.negate(), AssetType.INVESTMENT, user);
        }
    }

    private void adjustTradingCapital(String name, BigDecimal adjustment, AssetType type, User user) {
        List<Asset> existingAssets = assetRepository.findByUser(user);
        Optional<Asset> existingAsset = existingAssets.stream()
                .filter(a -> a.getName().equals(name))
                .findFirst();

        if (existingAsset.isPresent()) {
            Asset asset = existingAsset.get();
            BigDecimal newValue = asset.getValue().add(adjustment);
            asset.setValue(newValue.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : newValue);
            asset.setDate(LocalDate.now());
            assetRepository.save(asset);
        } else if (adjustment.compareTo(BigDecimal.ZERO) > 0) {
            // Only create if positive adjustment
            Asset newAsset = Asset.builder()
                    .name(name)
                    .value(adjustment)
                    .type(type)
                    .category(AssetCategory.INVESTMENTS)
                    .date(LocalDate.now())
                    .description("Trading capital")
                    .user(user)
                    .build();
            assetRepository.save(newAsset);
        }
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
