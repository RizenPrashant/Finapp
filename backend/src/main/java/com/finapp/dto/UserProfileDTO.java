package com.finapp.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDTO {
    
    private Long id;
    
    private String email;
    
    private String firstName;
    
    private String lastName;
    
    @Size(max = 20, message = "Phone number must be less than 20 characters")
    private String phone;
    
    @Size(max = 100, message = "Company must be less than 100 characters")
    private String company;
    
    @Size(max = 500, message = "Bio must be less than 500 characters")
    private String bio;
    
    // Base64 encoded profile picture (max 2MB)
    private String profilePicture;
    
    private String createdAt;
    private String updatedAt;
}
