package com.finapp.service;

import com.finapp.model.CompoundingHistory;
import com.finapp.model.CompoundingSettings;
import com.finapp.model.User;
import com.finapp.repository.CompoundingHistoryRepository;
import com.finapp.repository.CompoundingSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompoundingService {

    private final CompoundingSettingsRepository settingsRepository;
    private final CompoundingHistoryRepository historyRepository;

    // ========== Settings Management ==========

    @Transactional
    public CompoundingSettings getOrCreateSettings(User user) {
        return settingsRepository.findByUser(user)
                .orElseGet(() -> {
                    CompoundingSettings settings = CompoundingSettings.builder()
                            .user(user)
                            .build();
                    return settingsRepository.save(settings);
                });
    }

    @Transactional
    public CompoundingSettings updateSettings(User user, CompoundingSettings newSettings) {
        CompoundingSettings settings = getOrCreateSettings(user);
        
        if (newSettings.getReinvestPercentage() != null) {
            settings.setReinvestPercentage(newSettings.getReinvestPercentage());
        }
        if (newSettings.getAutoCompound() != null) {
            settings.setAutoCompound(newSettings.getAutoCompound());
        }
        if (newSettings.getApplyToTrading() != null) {
            settings.setApplyToTrading(newSettings.getApplyToTrading());
        }
        if (newSettings.getApplyToInvestments() != null) {
            settings.setApplyToInvestments(newSettings.getApplyToInvestments());
        }
        if (newSettings.getMinReinvestAmount() != null) {
            settings.setMinReinvestAmount(newSettings.getMinReinvestAmount());
        }

        return settingsRepository.save(settings);
    }

    // ========== Compounding Processing ==========

    /**
     * Process profit from any source (trading, investments, etc)
     * Automatically reinvests based on settings
     */
    @Transactional
    public void processProfit(User user, BigDecimal profit, String source, String description) {
        if (profit == null || profit.compareTo(BigDecimal.ZERO) <= 0) {
            return; // No profit to compound
        }

        CompoundingSettings settings = getOrCreateSettings(user);
        
        if (!settings.isEnabledFor(source)) {
            log.debug("Compounding disabled for source: {} for user: {}", source, user.getId());
            return;
        }

        // Check for existing entry today and update it instead of creating duplicate
        List<CompoundingHistory> existingToday = historyRepository.findDuplicateToday(user, source, description, profit);
        if (!existingToday.isEmpty()) {
            log.info("Updating existing compounding entry for today. User: {}, Source: {}, Description: {}",
                    user.getId(), source, description);
            CompoundingHistory existing = existingToday.get(0);
            
            // Reverse the old reinvest amount from capital
            settings.setCompoundingCapital(settings.getCompoundingCapital().subtract(existing.getReinvestAmount()));
            settings.setTotalReinvestedProfits(settings.getTotalReinvestedProfits().subtract(existing.getReinvestAmount()));
            
            // Calculate new reinvest amount
            BigDecimal reinvestAmount = settings.calculateReinvestAmount(profit);
            
            // Update the existing entry
            existing.setProfit(profit);
            existing.setReinvestAmount(reinvestAmount);
            existing.setEndingCapital(settings.getCompoundingCapital().add(reinvestAmount));
            historyRepository.save(existing);
            
            // Add new reinvest amount to capital
            settings.setCompoundingCapital(settings.getCompoundingCapital().add(reinvestAmount));
            settings.setTotalReinvestedProfits(settings.getTotalReinvestedProfits().add(reinvestAmount));
            settingsRepository.save(settings);
            
            log.info("Updated compounding entry. New reinvest: {}. Capital: {}", reinvestAmount, settings.getCompoundingCapital());
            return;
        }

        BigDecimal reinvestAmount = settings.calculateReinvestAmount(profit);
        
        if (reinvestAmount.compareTo(BigDecimal.ZERO) > 0) {
            // Update compounding capital
            settings.setCompoundingCapital(settings.getCompoundingCapital().add(reinvestAmount));
            settings.setTotalReinvestedProfits(settings.getTotalReinvestedProfits().add(reinvestAmount));
            settingsRepository.save(settings);

            // Create history entry
            createCompoundingEntry(user, profit, reinvestAmount, source, description, settings.getCompoundingCapital());

            log.info("Compounded {} from {} profit of {}. New capital: {}",
                    reinvestAmount, source, profit, settings.getCompoundingCapital());
        }
    }

    /**
     * Process trading profit when trade closes
     */
    @Transactional
    public void processTradingProfit(User user, BigDecimal profit, String tradeDetails) {
        processProfit(user, profit, "TRADING", "Trade profit: " + tradeDetails);
    }

    /**
     * Process trading profit with manual reinvest amount
     */
    @Transactional
    public void processTradingProfitWithAmount(User user, BigDecimal profit, BigDecimal manualReinvestAmount, String tradeDetails, Long tradeId) {
        log.info("DEBUG: processTradingProfitWithAmount called - profit: {}, manualReinvestAmount: {}, tradeId: {}", profit, manualReinvestAmount, tradeId);

        if (profit == null || profit.compareTo(BigDecimal.ZERO) <= 0) {
            log.info("DEBUG: No profit to compound");
            return; // No profit to compound
        }

        String description = "Trade profit: " + tradeDetails;
        CompoundingSettings settings = getOrCreateSettings(user);

        // Check for existing entry today and update it
        List<CompoundingHistory> existingToday = historyRepository.findExistingToday(user, "TRADING", description);
        if (!existingToday.isEmpty()) {
            log.info("Updating existing trading compounding entry for today. User: {}, Trade: {}", user.getId(), tradeDetails);
            CompoundingHistory existing = existingToday.get(0);
            
            // Reverse the old reinvest amount from capital
            settings.setCompoundingCapital(settings.getCompoundingCapital().subtract(existing.getReinvestAmount()));
            settings.setTotalReinvestedProfits(settings.getTotalReinvestedProfits().subtract(existing.getReinvestAmount()));
            
            // Use the manual amount (capped at profit amount)
            BigDecimal reinvestAmount = manualReinvestAmount != null ? manualReinvestAmount.min(profit) : settings.calculateReinvestAmount(profit);
            
            // Update the existing entry
            existing.setProfit(profit);
            existing.setReinvestAmount(reinvestAmount);
            existing.setEndingCapital(settings.getCompoundingCapital().add(reinvestAmount));
            existing.setTradeId(tradeId);
            historyRepository.save(existing);
            
            // Add new reinvest amount to capital
            settings.setCompoundingCapital(settings.getCompoundingCapital().add(reinvestAmount));
            settings.setTotalReinvestedProfits(settings.getTotalReinvestedProfits().add(reinvestAmount));
            settingsRepository.save(settings);
            
            log.info("Updated trading compounding entry. New reinvest: {}. Capital: {}", reinvestAmount, settings.getCompoundingCapital());
            return;
        }

        if (manualReinvestAmount == null || manualReinvestAmount.compareTo(BigDecimal.ZERO) <= 0) {
            log.info("DEBUG: No manual amount specified, falling back to auto");
            // Fall back to auto compounding
            processProfit(user, profit, "TRADING", description);
            return;
        }

        // Use the manual amount (capped at profit amount)
        BigDecimal reinvestAmount = manualReinvestAmount.min(profit);
        log.info("DEBUG: Using reinvestAmount: {} (manual: {}, profit: {})", reinvestAmount, manualReinvestAmount, profit);

        // Update compounding capital
        settings.setCompoundingCapital(settings.getCompoundingCapital().add(reinvestAmount));
        settings.setTotalReinvestedProfits(settings.getTotalReinvestedProfits().add(reinvestAmount));
        settingsRepository.save(settings);

        // Create history entry with tradeId
        createCompoundingEntry(user, profit, reinvestAmount, "TRADING", description, settings.getCompoundingCapital(), tradeId);

        log.info("Manually compounded {} from {} profit of {}. New capital: {}",
                reinvestAmount, "TRADING", profit, settings.getCompoundingCapital());
    }

    /**
     * Reverse compounding for a trade when it's being updated
     */
    @Transactional
    public void reverseCompoundingForTrade(User user, Long tradeId) {
        if (tradeId == null) {
            log.info("DEBUG reverseCompounding: tradeId is null, returning");
            return;
        }

        log.info("DEBUG reverseCompounding: Looking for entries with tradeId={}", tradeId);
        List<CompoundingHistory> entries = historyRepository.findByTradeId(tradeId);
        log.info("DEBUG reverseCompounding: Found {} entries for tradeId={}", entries.size(), tradeId);

        if (entries.isEmpty()) {
            log.info("DEBUG reverseCompounding: No entries found for tradeId={}, nothing to reverse", tradeId);
            return; // No compounding to reverse
        }

        CompoundingSettings settings = getOrCreateSettings(user);
        BigDecimal totalToReverse = entries.stream()
                .map(CompoundingHistory::getReinvestAmount)
                .filter(ra -> ra != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalToReverse.compareTo(BigDecimal.ZERO) > 0) {
            // Subtract from compounding capital
            settings.setCompoundingCapital(settings.getCompoundingCapital().subtract(totalToReverse));
            settings.setTotalReinvestedProfits(settings.getTotalReinvestedProfits().subtract(totalToReverse));
            settingsRepository.save(settings);

            log.info("Reversed compounding of {} for trade {}. New capital: {}",
                    totalToReverse, tradeId, settings.getCompoundingCapital());
        }

        // Delete the compounding history entries
        log.info("DEBUG reverseCompounding: Deleting {} entries for tradeId={}", entries.size(), tradeId);
        historyRepository.deleteByTradeId(tradeId);
        log.info("DEBUG reverseCompounding: Deleted entries for tradeId={}", tradeId);
    }

    /**
     * Process investment interest/dividend
     */
    @Transactional
    public void processInvestmentProfit(User user, BigDecimal profit, String investmentName) {
        processProfit(user, profit, "INVESTMENTS", "Returns from: " + investmentName);
    }

    /**
     * Process investment profit with manual reinvest amount
     */
    @Transactional
    public void processInvestmentProfitWithAmount(User user, BigDecimal profit, BigDecimal manualReinvestAmount, String investmentDetails) {
        log.info("DEBUG: processInvestmentProfitWithAmount called - profit: {}, manualReinvestAmount: {}", profit, manualReinvestAmount);

        if (profit == null || profit.compareTo(BigDecimal.ZERO) <= 0) {
            log.info("DEBUG: No profit to compound");
            return; // No profit to compound
        }

        CompoundingSettings settings = getOrCreateSettings(user);

        // Check for existing entry today and update it
        List<CompoundingHistory> existingToday = historyRepository.findExistingToday(user, "INVESTMENTS", investmentDetails);
        if (!existingToday.isEmpty()) {
            log.info("Updating existing investment compounding entry for today. User: {}, Details: {}", user.getId(), investmentDetails);
            CompoundingHistory existing = existingToday.get(0);
            
            // Reverse the old reinvest amount from capital
            settings.setCompoundingCapital(settings.getCompoundingCapital().subtract(existing.getReinvestAmount()));
            settings.setTotalReinvestedProfits(settings.getTotalReinvestedProfits().subtract(existing.getReinvestAmount()));
            
            // Use the manual amount (capped at profit amount)
            BigDecimal reinvestAmount = manualReinvestAmount != null ? manualReinvestAmount.min(profit) : settings.calculateReinvestAmount(profit);
            
            // Update the existing entry
            existing.setProfit(profit);
            existing.setReinvestAmount(reinvestAmount);
            existing.setEndingCapital(settings.getCompoundingCapital().add(reinvestAmount));
            historyRepository.save(existing);
            
            // Add new reinvest amount to capital
            settings.setCompoundingCapital(settings.getCompoundingCapital().add(reinvestAmount));
            settings.setTotalReinvestedProfits(settings.getTotalReinvestedProfits().add(reinvestAmount));
            settingsRepository.save(settings);
            
            log.info("Updated investment compounding entry. New reinvest: {}. Capital: {}", reinvestAmount, settings.getCompoundingCapital());
            return;
        }

        if (manualReinvestAmount == null || manualReinvestAmount.compareTo(BigDecimal.ZERO) <= 0) {
            log.info("DEBUG: No manual amount specified, falling back to auto");
            // Fall back to auto compounding
            processProfit(user, profit, "INVESTMENTS", investmentDetails);
            return;
        }

        // Use the manual amount (capped at profit amount)
        BigDecimal reinvestAmount = manualReinvestAmount.min(profit);
        log.info("DEBUG: Using reinvestAmount: {} (manual: {}, profit: {})", reinvestAmount, manualReinvestAmount, profit);

        // Update compounding capital
        settings.setCompoundingCapital(settings.getCompoundingCapital().add(reinvestAmount));
        settings.setTotalReinvestedProfits(settings.getTotalReinvestedProfits().add(reinvestAmount));
        settingsRepository.save(settings);

        // Create history entry
        createCompoundingEntry(user, profit, reinvestAmount, "INVESTMENTS", investmentDetails, settings.getCompoundingCapital());

        log.info("Manually compounded {} from {} profit of {}. New capital: {}",
                reinvestAmount, "INVESTMENTS", profit, settings.getCompoundingCapital());
    }

    private void createCompoundingEntry(User user, BigDecimal profit, BigDecimal reinvestAmount,
                                       String source, String description, BigDecimal currentCapital, Long tradeId) {
        LocalDate now = LocalDate.now();
        String month = now.format(DateTimeFormatter.ofPattern("MMMM"));
        int year = now.getYear();

        BigDecimal startingCapital = currentCapital.subtract(reinvestAmount);

        CompoundingHistory history = CompoundingHistory.builder()
                .startingCapital(startingCapital.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : startingCapital)
                .endingCapital(currentCapital)
                .profit(profit)
                .reinvestAmount(reinvestAmount)
                .reinvested(true)
                .month(month)
                .year(year)
                .source(source)
                .description(description)
                .tradeId(tradeId)
                .user(user)
                .build();

        historyRepository.save(history);
    }

    // Overload for backward compatibility (without tradeId)
    private void createCompoundingEntry(User user, BigDecimal profit, BigDecimal reinvestAmount,
                                       String source, String description, BigDecimal currentCapital) {
        createCompoundingEntry(user, profit, reinvestAmount, source, description, currentCapital, null);
    }

    // ========== Queries ==========

    public CompoundingSettings getSettings(User user) {
        return getOrCreateSettings(user);
    }

    public BigDecimal getCompoundingCapital(User user) {
        return getOrCreateSettings(user).getCompoundingCapital();
    }

    public BigDecimal getTotalReinvestedProfits(User user) {
        return getOrCreateSettings(user).getTotalReinvestedProfits();
    }
}
