package com.finapp.controller;

import com.finapp.dto.UserProfileDTO;
import com.finapp.model.User;
import com.finapp.service.UserProfileService;
import com.finapp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<UserProfileDTO> getProfile(Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(userProfileService.getProfile(user));
    }

    @PutMapping
    public ResponseEntity<UserProfileDTO> updateProfile(
            @Valid @RequestBody UserProfileDTO dto,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(userProfileService.updateProfile(user, dto));
    }
}
