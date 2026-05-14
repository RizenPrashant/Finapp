package com.finapp.repository;

import com.finapp.model.UdharRecord;
import com.finapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UdharRecordRepository extends JpaRepository<UdharRecord, Long> {
    List<UdharRecord> findByUserOrderByDateDesc(User user);
    List<UdharRecord> findByUserAndTypeOrderByDateDesc(User user, UdharRecord.UdharType type);
    Optional<UdharRecord> findByIdAndUser(Long id, User user);
}
