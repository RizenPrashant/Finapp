package com.finapp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CashbackWalletDTO {
    @NotBlank(message = "Platform name is required")
    private String platform;
    private String icon;
    private String color;
    private String logoUrl;
}
