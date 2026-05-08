package com.finapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String title;

    @NotNull
    @Positive
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @NotNull
    @Column(columnDefinition = "VARCHAR(10)")
    private TransactionType type; // CREDIT or DEBIT

    @NotBlank
    private String category;

    @NotBlank
    private String budgetCategory;

    @NotNull
    private LocalDate date;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"transactions", "assets", "budgets", "password"})
    private User user;
}
