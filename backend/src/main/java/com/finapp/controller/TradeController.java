package com.finapp.controller;

import com.finapp.dto.TradeAnalyticsDTO;
import com.finapp.dto.TradeDTO;
import com.finapp.dto.CompoundingHistoryDTO;
import com.finapp.model.Trade;
import com.finapp.model.CompoundingHistory;
import com.finapp.model.TradeSegment;
import com.finapp.model.TradeStatus;
import com.finapp.model.User;
import com.finapp.service.TradingService;
import com.finapp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/trading")
@RequiredArgsConstructor
public class TradeController {

    private final TradingService tradingService;
    private final UserService userService;

    // ========== Trades ==========

    @GetMapping("/trades")
    public ResponseEntity<List<Trade>> getAllTrades(Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(tradingService.getAllTrades(user));
    }

    @GetMapping("/trades/status/{status}")
    public ResponseEntity<List<Trade>> getTradesByStatus(
            @PathVariable TradeStatus status,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(tradingService.getTradesByStatus(user, status));
    }

    @GetMapping("/trades/segment/{segment}")
    public ResponseEntity<List<Trade>> getTradesBySegment(
            @PathVariable TradeSegment segment,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(tradingService.getTradesBySegment(user, segment));
    }

    @GetMapping("/trades/broker/{broker}")
    public ResponseEntity<List<Trade>> getTradesByBroker(
            @PathVariable String broker,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(tradingService.getTradesByBroker(user, broker));
    }

    @GetMapping("/brokers")
    public ResponseEntity<List<String>> getBrokers(Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(tradingService.getBrokers(user));
    }

    @PostMapping("/trades")
    public ResponseEntity<Trade> createTrade(
            @Valid @RequestBody TradeDTO dto,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(tradingService.createTrade(dto, user));
    }

    @PutMapping("/trades/{id}")
    public ResponseEntity<Trade> updateTrade(
            @PathVariable Long id,
            @Valid @RequestBody TradeDTO dto,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(tradingService.updateTrade(id, dto, user));
    }

    @DeleteMapping("/trades/{id}")
    public ResponseEntity<Void> deleteTrade(
            @PathVariable Long id,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        tradingService.deleteTrade(id, user);
        return ResponseEntity.ok().build();
    }

    // ========== Analytics ==========

    @GetMapping("/analytics")
    public ResponseEntity<TradeAnalyticsDTO> getAnalytics(Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(tradingService.getAnalytics(user));
    }

    @GetMapping("/capital")
    public ResponseEntity<BigDecimal> getCurrentCapital(Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(tradingService.getCurrentCapital(user));
    }

    // ========== Compounding History ==========

    @GetMapping("/compounding")
    public ResponseEntity<List<CompoundingHistory>> getCompoundingHistory(Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(tradingService.getCompoundingHistory(user));
    }

    @PostMapping("/compounding")
    public ResponseEntity<CompoundingHistory> createCompoundingHistory(
            @Valid @RequestBody CompoundingHistoryDTO dto,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        return ResponseEntity.ok(tradingService.createCompoundingHistory(dto, user));
    }

    @DeleteMapping("/compounding/{id}")
    public ResponseEntity<Void> deleteCompoundingHistory(
            @PathVariable Long id,
            Authentication authentication) {
        User user = userService.getCurrentUser(authentication);
        tradingService.deleteCompoundingHistory(id, user);
        return ResponseEntity.ok().build();
    }
}
