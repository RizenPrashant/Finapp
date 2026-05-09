package com.finapp.repository;

import com.finapp.model.Asset;
import com.finapp.model.AssetCategory;
import com.finapp.model.AssetType;
import com.finapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {

    // User-specific queries
    List<Asset> findByUser(User user);

    List<Asset> findByUserIsNull();

    Optional<Asset> findByIdAndUser(Long id, User user);

    List<Asset> findByUserAndType(User user, AssetType type);

    List<Asset> findByUserAndCategory(User user, AssetCategory category);

    @Query("SELECT COALESCE(SUM(a.value), 0) FROM Asset a WHERE a.user = :user AND a.type = :type")
    BigDecimal sumByUserAndType(@Param("user") User user, @Param("type") AssetType type);

    // Legacy methods
    List<Asset> findByType(AssetType type);

    @Query("SELECT COALESCE(SUM(a.value), 0) FROM Asset a WHERE a.type = :type")
    BigDecimal sumByType(AssetType type);

    @Query("SELECT a FROM Asset a WHERE a.type = :type")
    List<Asset> findAllByType(AssetType type);
}
