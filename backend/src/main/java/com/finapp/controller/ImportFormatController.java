/*
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
package com.finapp.controller;

import com.finapp.model.ImportFormat;
import com.finapp.model.User;
import com.finapp.repository.UserRepository;
import com.finapp.service.ImportFormatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/import-formats")
@RequiredArgsConstructor
public class ImportFormatController {

    private final ImportFormatService importFormatService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<ImportFormat>> getAllFormats(Authentication authentication) {
        User user = getUser(authentication);
        return ResponseEntity.ok(importFormatService.getAllFormats(user));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<ImportFormat>> getFormatsByType(
            @PathVariable String type,
            Authentication authentication) {
        User user = getUser(authentication);
        return ResponseEntity.ok(importFormatService.getFormatsByType(type, user));
    }

    @GetMapping("/banks")
    public ResponseEntity<List<ImportFormat>> getBankFormats(Authentication authentication) {
        User user = getUser(authentication);
        return ResponseEntity.ok(importFormatService.getBankFormats(user));
    }

    @GetMapping("/brokers")
    public ResponseEntity<List<ImportFormat>> getBrokerFormats(Authentication authentication) {
        User user = getUser(authentication);
        return ResponseEntity.ok(importFormatService.getBrokerFormats(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ImportFormat> getFormatById(
            @PathVariable Long id,
            Authentication authentication) {
        User user = getUser(authentication);
        return importFormatService.getFormatById(id, user)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ImportFormat> createFormat(
            @Valid @RequestBody ImportFormat format,
            Authentication authentication) {
        User user = getUser(authentication);
        return ResponseEntity.ok(importFormatService.createFormat(format, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ImportFormat> updateFormat(
            @PathVariable Long id,
            @Valid @RequestBody ImportFormat format,
            Authentication authentication) {
        User user = getUser(authentication);
        return ResponseEntity.ok(importFormatService.updateFormat(id, format, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFormat(
            @PathVariable Long id,
            Authentication authentication) {
        User user = getUser(authentication);
        importFormatService.deleteFormat(id, user);
        return ResponseEntity.ok().build();
    }

    private User getUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
