package com.finapp.model;

import jakarta.persistence.*;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "budget_limits", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "category"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetLimit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String category;

    @NotNull
    private BigDecimal limitAmount;

    private String color;
    private String note;
    private String icon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"transactions", "assets", "budgets", "password"})
    private User user;
}
