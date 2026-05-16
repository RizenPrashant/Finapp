package com.finapp.service;

import com.finapp.dto.AssetDTO;
import com.finapp.model.Asset;
import com.finapp.model.AssetCategory;
import com.finapp.model.AssetType;
import com.finapp.model.User;
import com.finapp.repository.AssetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssetService {

    private final AssetRepository assetRepository;

    public List<Asset> getAll(User user) {
        List<Asset> assets = assetRepository.findByUser(user);
        // If user has no assets, try to assign orphan assets first
        if (assets.isEmpty()) {
            List<Asset> orphanAssets = assetRepository.findByUserIsNull();
            if (!orphanAssets.isEmpty()) {
                orphanAssets.forEach(a -> a.setUser(user));
                assetRepository.saveAll(orphanAssets);
                assets = assetRepository.findByUser(user);
            }
        }
        return assets;
    }

    public List<Asset> getByType(AssetType type, User user) {
        return assetRepository.findByUserAndType(user, type);
    }

    public Asset create(AssetDTO dto, User user) {
        Asset asset = Asset.builder()
                .name(dto.getName())
                .value(dto.getValue())
                .type(dto.getType())
                .category(dto.getCategory())
                .subCategory(dto.getSubCategory())
                .date(dto.getDate())
                .description(dto.getDescription())
                .hasTransactions(dto.getHasTransactions() != null ? dto.getHasTransactions() : false)
                .creditLimit(dto.getCreditLimit())
                .user(user)
                .build();
        return assetRepository.save(asset);
    }

    public List<Asset> getByCategory(AssetCategory category, User user) {
        return assetRepository.findByUserAndCategory(user, category);
    }

    public Asset update(Long id, AssetDTO dto, User user) {
        Asset existing = assetRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Asset not found: " + id));
        existing.setName(dto.getName());
        existing.setValue(dto.getValue());
        existing.setType(dto.getType());
        existing.setCategory(dto.getCategory());
        existing.setSubCategory(dto.getSubCategory());
        existing.setDate(dto.getDate());
        existing.setDescription(dto.getDescription());
        if (dto.getHasTransactions() != null) {
            existing.setHasTransactions(dto.getHasTransactions());
        }
        if (dto.getCreditLimit() != null) {
            existing.setCreditLimit(dto.getCreditLimit());
        }
        return assetRepository.save(existing);
    }

    private static final List<String> PROTECTED_ASSETS = List.of("Trading Capital", "Investment Capital");

    public void delete(Long id, User user) {
        Asset asset = assetRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Asset not found: " + id));

        if (PROTECTED_ASSETS.contains(asset.getName())) {
            throw new RuntimeException("Cannot delete auto-generated asset: " + asset.getName());
        }

        assetRepository.delete(asset);
    }

    public BigDecimal sumByType(AssetType type, User user) {
        return assetRepository.sumByUserAndType(user, type);
    }
}
