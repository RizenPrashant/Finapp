package com.finapp.repository;

import com.finapp.model.Investment;
import com.finapp.model.InvestmentType;
import com.finapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvestmentRepository extends JpaRepository<Investment, Long> {
    
    List<Investment> findByUser(User user);
    
    Optional<Investment> findByIdAndUser(Long id, User user);
    
    List<Investment> findByUserAndType(User user, InvestmentType type);
    
    @Query("SELECT COALESCE(SUM(i.buyPrice * COALESCE(i.quantity, 1)), 0) FROM Investment i WHERE i.user = :user")
    BigDecimal sumTotalInvestedByUser(@Param("user") User user);
    
    @Query("SELECT COALESCE(SUM(i.currentValue * COALESCE(i.quantity, 1)), 0) FROM Investment i WHERE i.user = :user")
    BigDecimal sumTotalCurrentValueByUser(@Param("user") User user);
    
    @Query("SELECT i.type, COUNT(i), SUM(i.buyPrice * COALESCE(i.quantity, 1)), SUM(i.currentValue * COALESCE(i.quantity, 1)) " +
           "FROM Investment i WHERE i.user = :user GROUP BY i.type")
    List<Object[]> getTypeWiseAnalyticsByUser(@Param("user") User user);
    
    @Query("SELECT COALESCE(COUNT(i), 0) FROM Investment i WHERE i.user = :user AND i.currentValue > i.buyPrice")
    Long countProfitableInvestmentsByUser(@Param("user") User user);
    
    @Query("SELECT COALESCE(COUNT(i), 0) FROM Investment i WHERE i.user = :user AND i.currentValue < i.buyPrice")
    Long countLossMakingInvestmentsByUser(@Param("user") User user);
    
    @Query("SELECT COALESCE(SUM((i.currentValue - i.buyPrice) * COALESCE(i.quantity, 1)), 0) " +
           "FROM Investment i WHERE i.user = :user AND i.currentValue > i.buyPrice")
    BigDecimal sumProfitsByUser(@Param("user") User user);
    
    @Query("SELECT COALESCE(SUM((i.currentValue - i.buyPrice) * COALESCE(i.quantity, 1)), 0) " +
           "FROM Investment i WHERE i.user = :user AND i.currentValue < i.buyPrice")
    BigDecimal sumLossesByUser(@Param("user") User user);
}
