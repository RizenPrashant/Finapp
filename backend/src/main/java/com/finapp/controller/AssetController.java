package com.finapp.controller;

import com.finapp.dto.AssetDTO;
import com.finapp.model.Asset;
import com.finapp.model.AssetType;
import com.finapp.service.AssetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetService assetService;

    @GetMapping
    public List<Asset> getAll() {
        return assetService.getAll();
    }

    @GetMapping("/type/{type}")
    public List<Asset> getByType(@PathVariable AssetType type) {
        return assetService.getByType(type);
    }

    @PostMapping
    public ResponseEntity<Asset> create(@Valid @RequestBody AssetDTO dto) {
        return ResponseEntity.ok(assetService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Asset> update(@PathVariable Long id, @Valid @RequestBody AssetDTO dto) {
        return ResponseEntity.ok(assetService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        assetService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
