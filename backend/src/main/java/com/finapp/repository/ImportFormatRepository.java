/*
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
package com.finapp.repository;

import com.finapp.model.ImportFormat;
import com.finapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ImportFormatRepository extends JpaRepository<ImportFormat, Long> {

    // Get all system defaults + user-created formats
    List<ImportFormat> findByUserIsNullOrUser(User user);

    // Get only system defaults
    List<ImportFormat> findByUserIsNull();

    // Get only user-created formats
    List<ImportFormat> findByUser(User user);

    // Find by name and user (for custom formats)
    Optional<ImportFormat> findByNameAndUser(String name, User user);

    // Find system default by name
    Optional<ImportFormat> findByNameAndUserIsNull(String name);

    // Find by type (BANK or BROKER)
    List<ImportFormat> findByTypeAndUserIsNullOrTypeAndUser(String type1, String type2, User user);

    // Check if format exists
    boolean existsByNameAndUser(String name, User user);
}
