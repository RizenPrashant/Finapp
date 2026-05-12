package com.finapp.service;

import com.finapp.dto.UserProfileDTO;
import com.finapp.model.User;
import com.finapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserRepository userRepository;

    @Transactional
    public UserProfileDTO updateProfile(User user, UserProfileDTO dto) {
        // Update only allowed fields (email cannot be changed)
        if (dto.getFirstName() != null) {
            user.setFirstName(dto.getFirstName());
        }
        if (dto.getLastName() != null) {
            user.setLastName(dto.getLastName());
        }
        if (dto.getPhone() != null) {
            user.setPhone(dto.getPhone());
        }
        if (dto.getCompany() != null) {
            user.setCompany(dto.getCompany());
        }
        if (dto.getBio() != null) {
            user.setBio(dto.getBio());
        }
        if (dto.getProfilePicture() != null) {
            // Validate base64 size (rough check)
            if (dto.getProfilePicture().length() > 2000000) {
                throw new IllegalArgumentException("Profile picture too large. Max 2MB allowed.");
            }
            user.setProfilePicture(dto.getProfilePicture());
        }

        User saved = userRepository.save(user);
        return convertToDTO(saved);
    }

    @Transactional(readOnly = true)
    public UserProfileDTO getProfile(User user) {
        return convertToDTO(user);
    }

    private UserProfileDTO convertToDTO(User user) {
        return UserProfileDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .company(user.getCompany())
                .bio(user.getBio())
                .profilePicture(user.getProfilePicture())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null)
                .build();
    }
}
