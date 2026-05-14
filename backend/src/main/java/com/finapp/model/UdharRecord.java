package com.finapp.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "udhar_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UdharRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String personName;

    private String mobileNumber;

    @NotNull
    @Positive
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal settledAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UdharType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UdharStatus status = UdharStatus.PENDING;

    @NotNull
    private LocalDate date;

    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"udharRecords", "transactions", "assets", "budgets", "password"})
    private User user;

    @OneToMany(mappedBy = "udharRecord", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"udharRecord"})
    private List<UdharTransactionLink> udharTransactions;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum UdharType {
        GIVEN,    // Maine diya (Lent)
        TAKEN     // Maine liya (Borrowed)
    }

    public enum UdharStatus {
        PENDING,   // Kuch bhi wapas nahi hua
        PARTIAL,   // Kuch wapas ho gaya
        SETTLED    // Poora wapas ho gaya
    }
}
