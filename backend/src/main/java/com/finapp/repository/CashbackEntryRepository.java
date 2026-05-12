package com.finapp.repository;

import com.finapp.model.CashbackEntry;
import com.finapp.model.CashbackWallet;
import com.finapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CashbackEntryRepository extends JpaRepository<CashbackEntry, Long> {
    List<CashbackEntry> findByUserOrderByDateDesc(User user);
    List<CashbackEntry> findByWalletOrderByDateDesc(CashbackWallet wallet);
    Optional<CashbackEntry> findByIdAndUser(Long id, User user);
}
