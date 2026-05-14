package com.finapp.controller;

import com.finapp.dto.UdharRecordDTO;
import com.finapp.dto.UdharSettlementDTO;
import com.finapp.model.UdharRecord;
import com.finapp.model.UdharRecord.UdharType;
import com.finapp.model.UdharTransactionLink;
import com.finapp.model.User;
import com.finapp.repository.UserRepository;
import com.finapp.service.UdharService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/udhar")
@RequiredArgsConstructor
public class UdharController {

    private final UdharService udharService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/records")
    public List<UdharRecord> getAllRecords() {
        return udharService.getAllRecords(getCurrentUser());
    }

    @GetMapping("/records/type/{type}")
    public List<UdharRecord> getRecordsByType(@PathVariable UdharType type) {
        return udharService.getRecordsByType(getCurrentUser(), type);
    }

    @PostMapping("/records")
    public ResponseEntity<UdharRecord> createRecord(@Valid @RequestBody UdharRecordDTO dto) {
        return ResponseEntity.ok(udharService.createRecord(dto, getCurrentUser()));
    }

    @DeleteMapping("/records/{id}")
    public ResponseEntity<Void> deleteRecord(@PathVariable Long id) {
        udharService.deleteRecord(id, getCurrentUser());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/settle")
    public ResponseEntity<UdharRecord> settleUdhar(@Valid @RequestBody UdharSettlementDTO dto) {
        return ResponseEntity.ok(udharService.settleUdhar(dto, getCurrentUser()));
    }

    @GetMapping("/records/{id}/transactions")
    public List<UdharTransactionLink> getTransactionLinks(@PathVariable Long id) {
        return udharService.getTransactionLinks(id, getCurrentUser());
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary() {
        List<UdharRecord> all = udharService.getAllRecords(getCurrentUser());

        java.math.BigDecimal given = all.stream()
                .filter(r -> r.getType() == UdharType.GIVEN)
                .map(UdharRecord::getTotalAmount)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        java.math.BigDecimal taken = all.stream()
                .filter(r -> r.getType() == UdharType.TAKEN)
                .map(UdharRecord::getTotalAmount)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        java.math.BigDecimal givenSettled = all.stream()
                .filter(r -> r.getType() == UdharType.GIVEN)
                .map(UdharRecord::getSettledAmount)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        java.math.BigDecimal takenSettled = all.stream()
                .filter(r -> r.getType() == UdharType.TAKEN)
                .map(UdharRecord::getSettledAmount)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        java.math.BigDecimal givenOutstanding = given.subtract(givenSettled);
        java.math.BigDecimal takenOutstanding = taken.subtract(takenSettled);
        java.math.BigDecimal netOutstanding = givenOutstanding.subtract(takenOutstanding);

        return ResponseEntity.ok(Map.of(
                "givenTotal", given,
                "givenSettled", givenSettled,
                "givenOutstanding", givenOutstanding,
                "takenTotal", taken,
                "takenSettled", takenSettled,
                "takenOutstanding", takenOutstanding,
                "netOutstanding", netOutstanding,
                "totalRecords", all.size()
        ));
    }
}
