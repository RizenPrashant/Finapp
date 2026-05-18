package com.finapp.repository;

import com.finapp.model.CashbackWallet;
import com.finapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CashbackWalletRepository extends JpaRepository<CashbackWallet, Long> {
    List<CashbackWallet> findByUserOrderByPlatformAsc(User user);
    Optional<CashbackWallet> findByIdAndUser(Long id, User user);
    Optional<CashbackWallet> findByPlatformIgnoreCaseAndUser(String platform, User user);

    // For transaction payment source lookup (wallet name acts as payment source)
    default Optional<CashbackWallet> findByUserAndName(User user, String name) {
        return findByPlatformIgnoreCaseAndUser(name, user);
    }
}
