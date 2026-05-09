package com.finapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "trades")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String stockName;

    @Enumerated(EnumType.STRING)
    @NotNull
    @Column(columnDefinition = "VARCHAR(20)")
    private TradeSegment segment;

    @Enumerated(EnumType.STRING)
    @NotNull
    @Column(columnDefinition = "VARCHAR(20)")
    private TradeType tradeType;

    @Enumerated(EnumType.STRING)
    @NotNull
    @Column(columnDefinition = "VARCHAR(10)")
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

    @Enumerated(EnumType.STRING)
    @NotNull
    @Column(columnDefinition = "VARCHAR(10)")
    private TradeStatus status;

    @NotNull
    private LocalDate entryDate;

    private LocalDate exitDate;

    private String notes;

    @Column(nullable = false)
    private String broker = "ZERODHA";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"transactions", "assets", "budgets", "password"})
    private User user;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum TradeType {
        SWING,
        INTRADAY,
        LONG_TERM,
        SCALPING
    }

    public enum PositionType {
        LONG,
        SHORT
    }
}
