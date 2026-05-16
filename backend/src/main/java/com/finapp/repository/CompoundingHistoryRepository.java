package com.finapp.repository;

import com.finapp.model.CompoundingHistory;
import com.finapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CompoundingHistoryRepository extends JpaRepository<CompoundingHistory, Long> {

    List<CompoundingHistory> findByUser(User user);

    List<CompoundingHistory> findByUserIsNull();

    Optional<CompoundingHistory> findByIdAndUser(Long id, User user);

    List<CompoundingHistory> findByUserAndYearOrderByMonthAsc(User user, Integer year);

    @Query("SELECT SUM(c.profit) FROM CompoundingHistory c WHERE c.user = :user AND c.year = :year")
    BigDecimal sumProfitByUserAndYear(@Param("user") User user, @Param("year") Integer year);

    @Query("SELECT c.endingCapital FROM CompoundingHistory c WHERE c.user = :user ORDER BY c.createdAt DESC")
    List<BigDecimal> findLatestCapitalByUser(@Param("user") User user);

    List<CompoundingHistory> findByTradeId(Long tradeId);

    void deleteByTradeId(Long tradeId);

    // Check for duplicate entries on same day with same description and profit
    @Query("SELECT c FROM CompoundingHistory c WHERE c.user = :user AND c.source = :source AND c.description = :description AND c.profit = :profit AND DATE(c.createdAt) = CURRENT_DATE")
    List<CompoundingHistory> findDuplicateToday(@Param("user") User user, @Param("source") String source, @Param("description") String description, @Param("profit") BigDecimal profit);

    // Find existing entry by description for updates (without profit check)
    @Query("SELECT c FROM CompoundingHistory c WHERE c.user = :user AND c.source = :source AND c.description = :description AND DATE(c.createdAt) = CURRENT_DATE ORDER BY c.createdAt DESC")
    List<CompoundingHistory> findExistingToday(@Param("user") User user, @Param("source") String source, @Param("description") String description);

    // Get earliest entry to find initial capital
    @Query("SELECT c FROM CompoundingHistory c WHERE c.user = :user ORDER BY c.createdAt ASC")
    List<CompoundingHistory> findEarliestByUser(@Param("user") User user);

    // Sum reinvested amounts by source type (TRADING, INVESTMENTS)
    @Query("SELECT COALESCE(SUM(c.reinvestAmount), 0) FROM CompoundingHistory c WHERE c.user = :user AND c.source IN ('TRADING', 'INVESTMENTS')")
    BigDecimal sumReinvestedProfits(@Param("user") User user);

    // Get all manual entries ordered by date (first is initial, rest are fresh)
    @Query("SELECT c FROM CompoundingHistory c WHERE c.user = :user AND c.source = 'MANUAL' ORDER BY c.createdAt ASC")
    List<CompoundingHistory> findManualEntriesByUser(@Param("user") User user);
}
