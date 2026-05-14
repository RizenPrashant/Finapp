package com.finapp.controller;

import com.finapp.dto.TaxCalculationDTO;
import com.finapp.model.TaxProfile;
import com.finapp.model.User;
import com.finapp.repository.TaxProfileRepository;
import com.finapp.repository.UserRepository;
import com.finapp.service.TaxCalculationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/tax")
@RequiredArgsConstructor
public class TaxController {

    private final TaxCalculationService taxCalculationService;
    private final TaxProfileRepository taxProfileRepository;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/profile/{financialYear}")
    public ResponseEntity<TaxProfile> getTaxProfile(@PathVariable String financialYear) {
        User user = getCurrentUser();
        return taxProfileRepository.findByUserAndFinancialYear(user, financialYear)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(createDefaultProfile(user, financialYear)));
    }

    @PostMapping("/profile")
    public ResponseEntity<TaxProfile> saveTaxProfile(@RequestBody TaxProfile profile) {
        User user = getCurrentUser();

        // Check if profile exists for this FY
        TaxProfile existing = taxProfileRepository
                .findByUserAndFinancialYear(user, profile.getFinancialYear())
                .orElse(null);

        if (existing != null) {
            profile.setId(existing.getId());
        }

        profile.setUser(user);
        profile.setUpdatedAt(LocalDateTime.now());

        // Ensure standard deduction is set
        if (profile.getStandardDeduction() == null) {
            profile.setStandardDeduction(BigDecimal.valueOf(50000));
        }

        return ResponseEntity.ok(taxProfileRepository.save(profile));
    }

    @PostMapping("/calculate")
    public ResponseEntity<TaxCalculationDTO> calculateTax(@RequestBody TaxProfile profile) {
        User user = getCurrentUser();
        profile.setUser(user);

        // Ensure standard deduction
        if (profile.getStandardDeduction() == null) {
            profile.setStandardDeduction(BigDecimal.valueOf(50000));
        }

        return ResponseEntity.ok(taxCalculationService.calculateTax(profile));
    }

    @PostMapping("/compare")
    public ResponseEntity<TaxCalculationDTO> compareRegimes(@RequestBody TaxProfile profile) {
        User user = getCurrentUser();
        profile.setUser(user);

        return ResponseEntity.ok(taxCalculationService.compareRegimes(profile));
    }

    @GetMapping("/auto-calculate/{financialYear}")
    public ResponseEntity<TaxProfile> autoCalculate(@PathVariable String financialYear) {
        User user = getCurrentUser();
        TaxProfile profile = taxCalculationService.autoCalculateIncomeFromTransactions(
                user.getId(), financialYear);
        profile.setUser(user);
        return ResponseEntity.ok(profile);
    }

    @PostMapping("/projected")
    public ResponseEntity<TaxCalculationDTO> calculateProjectedTax(
            @RequestBody TaxProfile partialProfile,
            @RequestParam int monthsCompleted) {
        User user = getCurrentUser();
        partialProfile.setUser(user);

        return ResponseEntity.ok(taxCalculationService.calculateProjectedTax(partialProfile, monthsCompleted));
    }

    // Get supported financial years
    @GetMapping("/financial-years")
    public ResponseEntity<List<String>> getFinancialYears() {
        return ResponseEntity.ok(List.of("2023-24", "2024-25", "2025-26"));
    }

    private TaxProfile createDefaultProfile(User user, String financialYear) {
        return TaxProfile.builder()
                .user(user)
                .financialYear(financialYear)
                .regime(TaxProfile.TaxRegime.NEW)
                .employmentType(TaxProfile.EmploymentType.SALARIED)
                .standardDeduction(BigDecimal.valueOf(50000))
                .salaryIncome(BigDecimal.ZERO)
                .businessIncome(BigDecimal.ZERO)
                .interestIncome(BigDecimal.ZERO)
                .rentalIncome(BigDecimal.ZERO)
                .capitalGainsST(BigDecimal.ZERO)
                .capitalGainsLT(BigDecimal.ZERO)
                .otherIncome(BigDecimal.ZERO)
                .section80C(BigDecimal.ZERO)
                .section80D(BigDecimal.ZERO)
                .section80E(BigDecimal.ZERO)
                .section80G(BigDecimal.ZERO)
                .section80CCD1B(BigDecimal.ZERO)
                .section24B(BigDecimal.ZERO)
                .hraExemption(BigDecimal.ZERO)
                .ltaExemption(BigDecimal.ZERO)
                .updatedAt(LocalDateTime.now())
                .build();
    }
}
