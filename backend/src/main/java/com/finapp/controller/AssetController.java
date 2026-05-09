package com.finapp.controller;

import com.finapp.dto.AssetDTO;
import com.finapp.model.Asset;
import com.finapp.model.AssetCategory;
import com.finapp.model.AssetType;
import com.finapp.model.User;
import com.finapp.repository.UserRepository;
import com.finapp.service.AssetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetService assetService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public List<Asset> getAll() {
        return assetService.getAll(getCurrentUser());
    }

    @GetMapping("/type/{type}")
    public List<Asset> getByType(@PathVariable AssetType type) {
        return assetService.getByType(type, getCurrentUser());
    }

    @GetMapping("/category/{category}")
    public List<Asset> getByCategory(@PathVariable AssetCategory category) {
        return assetService.getByCategory(category, getCurrentUser());
    }

    @PostMapping
    public ResponseEntity<Asset> create(@Valid @RequestBody AssetDTO dto) {
        return ResponseEntity.ok(assetService.create(dto, getCurrentUser()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Asset> update(@PathVariable Long id, @Valid @RequestBody AssetDTO dto) {
        return ResponseEntity.ok(assetService.update(id, dto, getCurrentUser()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        assetService.delete(id, getCurrentUser());
        return ResponseEntity.noContent().build();
    }
}
