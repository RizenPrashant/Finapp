package com.finapp.service;

import com.finapp.dto.InvestmentDTO;
import com.finapp.model.*;
import com.finapp.repository.AssetRepository;
import com.finapp.repository.InvestmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvestmentService {

    private final InvestmentRepository investmentRepository;
    private final AssetRepository assetRepository;

    public List<InvestmentDTO> getAllInvestments(User user) {
        return investmentRepository.findByUser(user).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<InvestmentDTO> getInvestmentsByType(InvestmentType type, User user) {
        return investmentRepository.findByUserAndType(user, type).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public InvestmentDTO getInvestmentById(Long id, User user) {
        Investment investment = investmentRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Investment not found: " + id));
        return convertToDTO(investment);
    }

    @Transactional
    public InvestmentDTO createInvestment(InvestmentDTO dto, User user) {
        Investment investment = Investment.builder()
                .name(dto.getName())
                .type(dto.getType())
                .buyPrice(dto.getBuyPrice())
                .currentValue(dto.getCurrentValue())
                .quantity(dto.getQuantity() != null ? dto.getQuantity() : 1)
                .buyDate(dto.getBuyDate() != null ? dto.getBuyDate() : LocalDate.now())
                .notes(dto.getNotes())
                .interestEnabled(dto.getInterestEnabled() != null ? dto.getInterestEnabled() : false)
                .interestRate(dto.getInterestRate())
                .interestFrequency(dto.getInterestFrequency() != null ? dto.getInterestFrequency() : com.finapp.model.InterestFrequency.MONTHLY)
                .lastInterestDate(dto.getLastInterestDate())
                .user(user)
                .build();

        Investment saved = investmentRepository.save(investment);

        // Auto-update "Investment Capital" asset
        updateInvestmentCapitalAsset(user);

        return convertToDTO(saved);
    }

    @Transactional
    public InvestmentDTO updateInvestment(Long id, InvestmentDTO dto, User user) {
        Investment existing = investmentRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Investment not found: " + id));

        existing.setName(dto.getName());
        existing.setType(dto.getType());
        existing.setBuyPrice(dto.getBuyPrice());
        existing.setCurrentValue(dto.getCurrentValue());
        existing.setQuantity(dto.getQuantity() != null ? dto.getQuantity() : 1);
        existing.setBuyDate(dto.getBuyDate());
        existing.setNotes(dto.getNotes());
        
        // Update interest configuration
        if (dto.getInterestEnabled() != null) existing.setInterestEnabled(dto.getInterestEnabled());
        if (dto.getInterestRate() != null) existing.setInterestRate(dto.getInterestRate());
        if (dto.getInterestFrequency() != null) existing.setInterestFrequency(dto.getInterestFrequency());
        if (dto.getLastInterestDate() != null) existing.setLastInterestDate(dto.getLastInterestDate());

        Investment saved = investmentRepository.save(existing);

        // Auto-update "Investment Capital" asset
        updateInvestmentCapitalAsset(user);

        return convertToDTO(saved);
    }

    @Transactional
    public void deleteInvestment(Long id, User user) {
        Investment investment = investmentRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Investment not found: " + id));
        investmentRepository.delete(investment);

        // Auto-update "Investment Capital" asset
        updateInvestmentCapitalAsset(user);
    }

    // ========== Auto-update Investment Capital in Assets ==========

    @Transactional
    public void updateInvestmentCapitalAsset(User user) {
        String assetName = "Investment Capital";

        // Calculate total current value of all investments
        BigDecimal totalCurrentValue = investmentRepository.sumTotalCurrentValueByUser(user);

        // Find or create the Investment Capital asset
        List<Asset> existingAssets = assetRepository.findByUser(user);
        Optional<Asset> existingAsset = existingAssets.stream()
                .filter(a -> a.getName().equals(assetName))
                .findFirst();

        if (existingAsset.isPresent()) {
            Asset asset = existingAsset.get();
            asset.setValue(totalCurrentValue);
            asset.setDate(LocalDate.now());
            assetRepository.save(asset);
        } else if (totalCurrentValue.compareTo(BigDecimal.ZERO) > 0) {
            // Create new asset
            Asset newAsset = Asset.builder()
                    .name(assetName)
                    .value(totalCurrentValue)
                    .type(AssetType.INVESTMENT)
                    .category(AssetCategory.INVESTMENTS)
                    .date(LocalDate.now())
                    .description("Auto-generated from investments")
                    .user(user)
                    .build();
            assetRepository.save(newAsset);
        }
    }

    // ========== Analytics ==========

    public Map<String, Object> getAnalytics(User user) {
        Map<String, Object> analytics = new HashMap<>();

        BigDecimal totalInvested = investmentRepository.sumTotalInvestedByUser(user);
        BigDecimal totalCurrentValue = investmentRepository.sumTotalCurrentValueByUser(user);
        BigDecimal netProfitLoss = totalCurrentValue.subtract(totalInvested);
        BigDecimal profitLossPercentage = totalInvested.compareTo(BigDecimal.ZERO) > 0
                ? netProfitLoss.divide(totalInvested, 4, BigDecimal.ROUND_HALF_UP).multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

        Long profitableCount = investmentRepository.countProfitableInvestmentsByUser(user);
        Long lossCount = investmentRepository.countLossMakingInvestmentsByUser(user);
        BigDecimal totalProfits = investmentRepository.sumProfitsByUser(user);
        BigDecimal totalLosses = investmentRepository.sumLossesByUser(user);

        List<Object[]> typeWiseData = investmentRepository.getTypeWiseAnalyticsByUser(user);
        Map<String, Map<String, Object>> typeWiseAnalytics = new HashMap<>();

        for (Object[] row : typeWiseData) {
            InvestmentType type = (InvestmentType) row[0];
            Long count = (Long) row[1];
            BigDecimal invested = (BigDecimal) row[2];
            BigDecimal current = (BigDecimal) row[3];

            Map<String, Object> typeData = new HashMap<>();
            typeData.put("count", count);
            typeData.put("totalInvested", invested);
            typeData.put("totalCurrentValue", current);
            typeData.put("profitLoss", current.subtract(invested));
            typeWiseAnalytics.put(type.name(), typeData);
        }

        analytics.put("totalInvested", totalInvested);
        analytics.put("totalCurrentValue", totalCurrentValue);
        analytics.put("netProfitLoss", netProfitLoss);
        analytics.put("profitLossPercentage", profitLossPercentage);
        analytics.put("profitableCount", profitableCount);
        analytics.put("lossCount", lossCount);
        analytics.put("totalProfits", totalProfits);
        analytics.put("totalLosses", totalLosses);
        analytics.put("typeWise", typeWiseAnalytics);

        return analytics;
    }

    // ========== Helper Methods ==========

    private InvestmentDTO convertToDTO(Investment investment) {
        return InvestmentDTO.builder()
                .id(investment.getId())
                .name(investment.getName())
                .type(investment.getType())
                .buyPrice(investment.getBuyPrice())
                .currentValue(investment.getCurrentValue())
                .quantity(investment.getQuantity())
                .buyDate(investment.getBuyDate())
                .notes(investment.getNotes())
                // Interest fields
                .interestEnabled(investment.getInterestEnabled())
                .interestRate(investment.getInterestRate())
                .interestFrequency(investment.getInterestFrequency())
                .lastInterestDate(investment.getLastInterestDate())
                .interestDue(investment.isInterestDue())
                .monthsSinceLastInterest(investment.getMonthsSinceLastInterest())
                // Calculated fields
                .profitLoss(investment.getProfitLoss())
                .profitLossPercentage(investment.getProfitLossPercentage())
                .totalInvested(investment.getTotalInvested())
                .totalCurrentValue(investment.getTotalCurrentValue())
                .build();
    }
}
