package com.finapp.repository;

import com.finapp.model.Transaction;
import com.finapp.model.UdharRecord;
import com.finapp.model.UdharTransactionLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UdharTransactionLinkRepository extends JpaRepository<UdharTransactionLink, Long> {
    List<UdharTransactionLink> findByUdharRecordOrderByCreatedAtDesc(UdharRecord udharRecord);
    List<UdharTransactionLink> findByTransaction(Transaction transaction);
}
