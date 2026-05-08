package com.finapp.repository;

import com.finapp.model.Asset;
import com.finapp.model.AssetType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {

    List<Asset> findByType(AssetType type);

    @Query("SELECT COALESCE(SUM(a.value), 0) FROM Asset a WHERE a.type = :type")
    BigDecimal sumByType(AssetType type);

    @Query("SELECT a FROM Asset a WHERE a.type = :type")
    List<Asset> findAllByType(AssetType type);
}
