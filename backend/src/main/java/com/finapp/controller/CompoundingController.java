package com.finapp.controller;

import com.finapp.model.CompoundingHistory;
import com.finapp.model.CompoundingSettings;
import com.finapp.model.User;
import com.finapp.service.CompoundingService;
import com.finapp.repository.CompoundingHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/compounding")
@RequiredArgsConstructor
public class CompoundingController {

    private final CompoundingService compoundingService;
    private final CompoundingHistoryRepository historyRepository;

    // Get current compounding settings
    @GetMapping("/settings")
    public ResponseEntity<CompoundingSettings> getSettings(@RequestAttribute("currentUser") User user) {
        return ResponseEntity.ok(compoundingService.getSettings(user));
    }

    // Update compounding settings
    @PutMapping("/settings")
    public ResponseEntity<CompoundingSettings> updateSettings(
            @RequestAttribute("currentUser") User user,
            @RequestBody CompoundingSettings settings) {
        return ResponseEntity.ok(compoundingService.updateSettings(user, settings));
    }

    // Get compounding history
    @GetMapping("/history")
    public ResponseEntity<List<CompoundingHistory>> getHistory(@RequestAttribute("currentUser") User user) {
        return ResponseEntity.ok(historyRepository.findByUser(user));
    }

    // Get current compounding capital
    @GetMapping("/capital")
    public ResponseEntity<BigDecimal> getCapital(@RequestAttribute("currentUser") User user) {
        return ResponseEntity.ok(compoundingService.getCompoundingCapital(user));
    }

    // Get total reinvested profits
    @GetMapping("/profits")
    public ResponseEntity<BigDecimal> getTotalProfits(@RequestAttribute("currentUser") User user) {
        return ResponseEntity.ok(compoundingService.getTotalReinvestedProfits(user));
    }

    // Manual trigger to process profit (for testing)
    @PostMapping("/process")
    public ResponseEntity<Void> processProfit(
            @RequestAttribute("currentUser") User user,
            @RequestParam BigDecimal amount,
            @RequestParam String source,
            @RequestParam(required = false) String description) {
        compoundingService.processProfit(user, amount, source, description != null ? description : "Manual entry");
        return ResponseEntity.ok().build();
    }

    // Process investment profit with manual reinvest amount
    @PostMapping("/process-investment")
    public ResponseEntity<Void> processInvestmentProfit(
            @RequestAttribute("currentUser") User user,
            @RequestParam BigDecimal profit,
            @RequestParam BigDecimal reinvestAmount,
            @RequestParam(required = false) String description) {
        compoundingService.processInvestmentProfitWithAmount(user, profit, reinvestAmount, 
                description != null ? description : "Investment return");
        return ResponseEntity.ok().build();
    }
}
