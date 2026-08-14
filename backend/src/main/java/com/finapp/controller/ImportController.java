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

    // ── DEBUG ────────────────────────────────────────────────────────────────

    @PostMapping("/debug/pdf-text")
    public ResponseEntity<String> debugPdfText(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "pdfPassword", required = false) String pdfPassword) {
        try {
            byte[] bytes = file.getInputStream().readAllBytes();
            org.apache.pdfbox.pdmodel.PDDocument doc = (pdfPassword != null && !pdfPassword.isBlank())
                ? org.apache.pdfbox.Loader.loadPDF(bytes, pdfPassword)
                : org.apache.pdfbox.Loader.loadPDF(bytes);
            String text;
            try (doc) {
                org.apache.pdfbox.text.PDFTextStripper s = new org.apache.pdfbox.text.PDFTextStripper();
                s.setSortByPosition(true);
                text = s.getText(doc);
            }
            return ResponseEntity.ok(text);
        } catch (Exception e) { return ResponseEntity.badRequest().body("Error: " + e.getMessage()); }
    }

    // ── TRADES ───────────────────────────────────────────────────────────────

    @PostMapping("/trades")
    public ResponseEntity<ImportResponseDTO> importTrades(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            @RequestParam(value = "brokerType", required = false) String brokerType,
            @RequestParam(value = "formatId", required = false) Long formatId,
            @RequestParam(value = "pdfPassword", required = false) String pdfPassword,
            Authentication auth) {
        return ResponseEntity.ok(importService.importTrades(file, format, auth.getName(), brokerType, formatId, pdfPassword));
    }

    @PostMapping("/preview/trades")
    public ResponseEntity<ImportResponseDTO> previewTrades(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            @RequestParam(value = "brokerType", required = false) String brokerType,
            @RequestParam(value = "formatId", required = false) Long formatId,
            @RequestParam(value = "pdfPassword", required = false) String pdfPassword) {
        return ResponseEntity.ok(importService.previewTrades(file, format, brokerType, formatId, pdfPassword));
    }

    @PostMapping("/trades/json")
    public ResponseEntity<ImportResponseDTO> importTradesJson(@RequestBody TradesJsonRequest body, Authentication auth) {
        return ResponseEntity.ok(importService.importTradesJson(body.getTrades(), auth.getName()));
    }

    // ── BANK STATEMENT ───────────────────────────────────────────────────────

    @PostMapping("/bank-statement")
    public ResponseEntity<ImportResponseDTO> importBankStatement(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            @RequestParam("bankName") String bankName,
            @RequestParam(value = "bankType", required = false) String bankType,
            @RequestParam(value = "formatId", required = false) Long formatId,
            @RequestParam(value = "pdfPassword", required = false) String pdfPassword,
            Authentication auth) {
        return ResponseEntity.ok(importService.importBankStatement(file, format, bankName, auth.getName(), bankType, formatId, pdfPassword));
    }

    @PostMapping("/preview/bank-statement")
    public ResponseEntity<ImportResponseDTO> previewBankStatement(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            @RequestParam("bankName") String bankName,
            @RequestParam(value = "bankType", required = false) String bankType,
            @RequestParam(value = "formatId", required = false) Long formatId,
            @RequestParam(value = "pdfPassword", required = false) String pdfPassword) {
        return ResponseEntity.ok(importService.previewBankStatement(file, format, bankName, bankType, formatId, pdfPassword));
    }

    @PostMapping("/bank-statement/json")
    public ResponseEntity<ImportResponseDTO> importBankStatementJson(@RequestBody BankStatementJsonRequest body, Authentication auth) {
        String acctType = body.getAccountType() != null ? body.getAccountType() : "BANK";
        return ResponseEntity.ok(importService.importBankStatementJson(body.getBankName(), body.getTransactions(), auth.getName(), acctType));
    }

    // ── CREDIT CARD STATEMENT ────────────────────────────────────────────────

    @PostMapping("/cc-statement")
    public ResponseEntity<ImportResponseDTO> importCCStatement(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            @RequestParam("ccName") String ccName,
            @RequestParam(value = "formatId", required = false) Long formatId,
            @RequestParam(value = "pdfPassword", required = false) String pdfPassword,
            Authentication auth) {
        return ResponseEntity.ok(importService.importCCStatement(file, format, ccName, auth.getName(), formatId, pdfPassword));
    }

    @PostMapping("/preview/cc-statement")
    public ResponseEntity<ImportResponseDTO> previewCCStatement(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            @RequestParam(value = "formatId", required = false) Long formatId,
            @RequestParam(value = "pdfPassword", required = false) String pdfPassword) {
        return ResponseEntity.ok(importService.previewCCStatement(file, format, formatId, pdfPassword));
    }

    @PostMapping("/cc-statement/json")
    public ResponseEntity<ImportResponseDTO> importCCStatementJson(@RequestBody BankStatementJsonRequest body, Authentication auth) {
        return ResponseEntity.ok(importService.importBankStatementJson(body.getBankName(), body.getTransactions(), auth.getName(), "CREDIT_CARD"));
    }

    // ── REQUEST BODIES ───────────────────────────────────────────────────────

    @Data static class BankStatementJsonRequest {
        private String bankName;
        private String accountType;
        private List<TransactionDTO> transactions;
    }

    @Data static class TradesJsonRequest {
        private List<TradeDTO> trades;
    }
}
