package com.finapp.repository;

import com.finapp.model.Trade;
import com.finapp.model.TradeSegment;
import com.finapp.model.TradeStatus;
import com.finapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface TradeRepository extends JpaRepository<Trade, Long> {

    // User-specific queries
    List<Trade> findByUser(User user);

    List<Trade> findByUserIsNull();

    Optional<Trade> findByIdAndUser(Long id, User user);

    List<Trade> findByUserAndStatus(User user, TradeStatus status);

    List<Trade> findByUserAndSegment(User user, TradeSegment segment);

    List<Trade> findByUserAndStatusAndSegment(User user, TradeStatus status, TradeSegment segment);

    // Analytics queries
    @Query("SELECT COUNT(t) FROM Trade t WHERE t.user = :user")
    Long countByUser(@Param("user") User user);

    @Query("SELECT COUNT(t) FROM Trade t WHERE t.user = :user AND t.profitLoss > 0")
    Long countWinningTradesByUser(@Param("user") User user);

    @Query("SELECT COUNT(t) FROM Trade t WHERE t.user = :user AND t.profitLoss < 0")
    Long countLosingTradesByUser(@Param("user") User user);

    @Query("SELECT COALESCE(SUM(t.profitLoss), 0) FROM Trade t WHERE t.user = :user AND t.profitLoss > 0")
    BigDecimal sumProfitsByUser(@Param("user") User user);

    @Query("SELECT COALESCE(SUM(t.profitLoss), 0) FROM Trade t WHERE t.user = :user AND t.profitLoss < 0")
    BigDecimal sumLossesByUser(@Param("user") User user);

    @Query("SELECT COALESCE(SUM(t.profitLoss), 0) FROM Trade t WHERE t.user = :user")
    BigDecimal sumNetPnLByUser(@Param("user") User user);

    @Query("SELECT COALESCE(MAX(t.profitLoss), 0) FROM Trade t WHERE t.user = :user AND t.profitLoss > 0")
    BigDecimal findLargestProfitByUser(@Param("user") User user);

    @Query("SELECT COALESCE(MIN(t.profitLoss), 0) FROM Trade t WHERE t.user = :user AND t.profitLoss < 0")
    BigDecimal findLargestLossByUser(@Param("user") User user);

    @Query("SELECT COALESCE(SUM(t.investedAmount), 0) FROM Trade t WHERE t.user = :user")
    BigDecimal sumInvestedAmountByUser(@Param("user") User user);

    @Query("SELECT COALESCE(SUM(t.investedAmount), 0) FROM Trade t WHERE t.user = :user AND t.status = 'OPEN'")
    BigDecimal sumOpenPositionsCapitalByUser(@Param("user") User user);

    @Query("SELECT COALESCE(SUM(t.profitLoss), 0) FROM Trade t WHERE t.user = :user AND t.status = 'CLOSED'")
    BigDecimal sumRealizedPnLByUser(@Param("user") User user);

    @Query("SELECT COALESCE(SUM(t.profitLoss), 0) FROM Trade t WHERE t.user = :user AND t.status = 'OPEN'")
    BigDecimal sumUnrealizedPnLByUser(@Param("user") User user);

    // Segment-wise analytics
    @Query("SELECT t.segment, COUNT(t), SUM(t.profitLoss), AVG(t.profitLossPercentage) " +
           "FROM Trade t WHERE t.user = :user GROUP BY t.segment")
    List<Object[]> getSegmentAnalyticsByUser(@Param("user") User user);

    // Monthly PnL
    @Query("SELECT FUNCTION('MONTHNAME', t.exitDate), SUM(t.profitLoss) " +
           "FROM Trade t WHERE t.user = :user AND t.status = 'CLOSED' AND t.exitDate IS NOT NULL " +
           "GROUP BY FUNCTION('MONTHNAME', t.exitDate), FUNCTION('MONTH', t.exitDate) " +
           "ORDER BY FUNCTION('MONTH', t.exitDate)")
    List<Object[]> getMonthlyPnLByUser(@Param("user") User user);
}
