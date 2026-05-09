package com.finapp.controller;

import com.finapp.dto.InvestmentDTO;
import com.finapp.model.InvestmentType;
import com.finapp.model.User;
import com.finapp.service.InvestmentService;
import com.finapp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/investments")
@RequiredArgsConstructor
public class InvestmentController {

    private final InvestmentService investmentService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<InvestmentDTO>> getAllInvestments(Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(investmentService.getAllInvestments(user));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<InvestmentDTO>> getInvestmentsByType(
            @PathVariable InvestmentType type,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(investmentService.getInvestmentsByType(type, user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvestmentDTO> getInvestmentById(
            @PathVariable Long id,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(investmentService.getInvestmentById(id, user));
    }

    @PostMapping
    public ResponseEntity<InvestmentDTO> createInvestment(
            @Valid @RequestBody InvestmentDTO dto,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(investmentService.createInvestment(dto, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InvestmentDTO> updateInvestment(
            @PathVariable Long id,
            @Valid @RequestBody InvestmentDTO dto,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(investmentService.updateInvestment(id, dto, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvestment(
            @PathVariable Long id,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        investmentService.deleteInvestment(id, user);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics(Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(investmentService.getAnalytics(user));
    }
}
