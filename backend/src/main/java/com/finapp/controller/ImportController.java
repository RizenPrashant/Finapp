package com.finapp.controller;

import com.finapp.dto.ImportResponseDTO;
import com.finapp.dto.TradeDTO;
import com.finapp.dto.TransactionDTO;
import com.finapp.service.ImportService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
public class ImportController {

    private final ImportService importService;

    @PostMapping("/trades")
    public ResponseEntity<ImportResponseDTO> importTrades(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            @RequestParam(value = "brokerType", required = false) String brokerType,
            Authentication authentication) {

        ImportResponseDTO result = importService.importTrades(file, format, authentication.getName(), brokerType);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/bank-statement")
    public ResponseEntity<ImportResponseDTO> importBankStatement(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            @RequestParam(value = "bankName") String bankName,
            @RequestParam(value = "bankType", required = false) String bankType,
            @RequestParam(value = "accountType", defaultValue = "BANK") String accountType,
            Authentication authentication) {

        ImportResponseDTO result = importService.importBankStatement(file, format, bankName, authentication.getName(), bankType, accountType);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/preview/trades")
    public ResponseEntity<ImportResponseDTO> previewTrades(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            @RequestParam(value = "brokerType", required = false) String brokerType) {

        ImportResponseDTO result = importService.previewTrades(file, format, brokerType);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/preview/bank-statement")
    public ResponseEntity<ImportResponseDTO> previewBankStatement(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            @RequestParam(value = "bankName") String bankName,
            @RequestParam(value = "bankType", required = false) String bankType,
            @RequestParam(value = "accountType", defaultValue = "BANK") String accountType) {

        ImportResponseDTO result = importService.previewBankStatement(file, format, bankName, bankType);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/bank-statement/json")
    public ResponseEntity<ImportResponseDTO> importBankStatementJson(
            @RequestBody BankStatementJsonRequest body,
            Authentication authentication) {
        String acctType = body.getAccountType() != null ? body.getAccountType() : "BANK";
        ImportResponseDTO result = importService.importBankStatementJson(
                body.getBankName(), body.getTransactions(), authentication.getName(), acctType);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/trades/json")
    public ResponseEntity<ImportResponseDTO> importTradesJson(
            @RequestBody TradesJsonRequest body,
            Authentication authentication) {
        ImportResponseDTO result = importService.importTradesJson(
                body.getTrades(), authentication.getName());
        return ResponseEntity.ok(result);
    }

    @Data
    static class BankStatementJsonRequest {
        private String bankName;
        private String accountType; // BANK or CREDIT_CARD
        private List<TransactionDTO> transactions;
    }

    @Data
    static class TradesJsonRequest {
        private List<TradeDTO> trades;
    }
}
