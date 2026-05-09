package com.finapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "compounding_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompoundingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Positive
    private BigDecimal startingCapital;

    @NotNull
    @Positive
    private BigDecimal endingCapital;

    @NotNull
    private BigDecimal profit;

    @NotNull
    private Boolean reinvested;

    @NotNull
    private String month;

    @NotNull
    private Integer year;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"transactions", "assets", "budgets", "password"})
    private User user;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
