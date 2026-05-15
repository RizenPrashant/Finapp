package com.finapp.repository;

import com.finapp.model.CompoundingSettings;
import com.finapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CompoundingSettingsRepository extends JpaRepository<CompoundingSettings, Long> {

    Optional<CompoundingSettings> findByUser(User user);

    boolean existsByUser(User user);
}
