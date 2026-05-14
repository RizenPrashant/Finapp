package com.finapp.repository;

import com.finapp.model.TaxProfile;
import com.finapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TaxProfileRepository extends JpaRepository<TaxProfile, Long> {

    Optional<TaxProfile> findByUserAndFinancialYear(User user, String financialYear);

    Optional<TaxProfile> findByUserAndFinancialYearAndRegime(User user, String financialYear, TaxProfile.TaxRegime regime);
}
