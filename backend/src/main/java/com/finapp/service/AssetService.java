package com.finapp.service;

import com.finapp.dto.AssetDTO;
import com.finapp.model.Asset;
import com.finapp.model.AssetType;
import com.finapp.repository.AssetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssetService {

    private final AssetRepository assetRepository;

    public List<Asset> getAll() {
        return assetRepository.findAll();
    }

    public List<Asset> getByType(AssetType type) {
        return assetRepository.findByType(type);
    }

    public Asset create(AssetDTO dto) {
        Asset asset = Asset.builder()
                .name(dto.getName())
                .value(dto.getValue())
                .type(dto.getType())
                .category(dto.getCategory())
                .date(dto.getDate())
                .description(dto.getDescription())
                .build();
        return assetRepository.save(asset);
    }

    public Asset update(Long id, AssetDTO dto) {
        Asset existing = assetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Asset not found: " + id));
        existing.setName(dto.getName());
        existing.setValue(dto.getValue());
        existing.setType(dto.getType());
        existing.setCategory(dto.getCategory());
        existing.setDate(dto.getDate());
        existing.setDescription(dto.getDescription());
        return assetRepository.save(existing);
    }

    public void delete(Long id) {
        assetRepository.deleteById(id);
    }

    public BigDecimal sumByType(AssetType type) {
        return assetRepository.sumByType(type);
    }
}
