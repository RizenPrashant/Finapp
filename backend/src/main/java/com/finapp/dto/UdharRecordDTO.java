package com.finapp.dto;

import com.finapp.model.UdharRecord.UdharType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UdharRecordDTO {
    @NotBlank(message = "Person name is required")
    private String personName;

    private String mobileNumber;

    @NotNull
    @Positive
    private BigDecimal totalAmount;

    @NotNull
    private UdharType type; // GIVEN or TAKEN

    @NotNull
    private LocalDate date;

    private String notes;
}
