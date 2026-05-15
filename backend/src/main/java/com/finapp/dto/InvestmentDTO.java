package com.finapp.dto;

import com.finapp.model.InvestmentStatus;
import com.finapp.model.InvestmentType;
import com.finapp.model.InterestFrequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvestmentDTO {
    
    private Long id;
    
    @NotBlank(message = "Name is required")
    private String name;
    
    @NotNull(message = "Type is required")
    private InvestmentType type;
    
    @NotNull(message = "Buy price is required")
    private BigDecimal buyPrice;
    
    @NotNull(message = "Current value is required")
    private BigDecimal currentValue;
    
    private Integer quantity;
    
    private LocalDate buyDate;
    
    private String notes;
    
    // Status
    private InvestmentStatus status;
    
    // Interest configuration
    private Boolean interestEnabled;
    private BigDecimal interestRate;  // Annual rate in percentage (e.g., 7.5 for 7.5%)
    private InterestFrequency interestFrequency;
    private LocalDate lastInterestDate;
    
    // Interest status (calculated)
    private Boolean interestDue;
    private Long monthsSinceLastInterest;
    
    // Calculated fields (read-only)
    private BigDecimal profitLoss;
    private BigDecimal profitLossPercentage;
    private BigDecimal totalInvested;
    private BigDecimal totalCurrentValue;
}
