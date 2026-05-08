package com.finapp.controller;

import com.finapp.dto.DashboardSummaryDTO;
import com.finapp.model.User;
import com.finapp.repository.UserRepository;
import com.finapp.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/summary")
    public DashboardSummaryDTO getSummary() {
        return dashboardService.getSummary(getCurrentUser());
    }
}
