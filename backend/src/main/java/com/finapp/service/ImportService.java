package com.finapp.service;

import com.finapp.dto.ImportResponseDTO;
import com.finapp.dto.TradeDTO;
import com.finapp.dto.TransactionDTO;
import com.finapp.model.Asset;
import com.finapp.model.AssetCategory;
import com.finapp.model.AssetType;
import com.finapp.model.ImportFormat;
import com.finapp.model.Trade;
import com.finapp.model.TradeSegment;
import com.finapp.model.TradeStatus;
import com.finapp.model.Transaction;
import com.finapp.model.TransactionType;
import com.finapp.model.User;
import com.finapp.repository.AssetRepository;
import com.finapp.repository.ImportFormatRepository;
import com.finapp.repository.TradeRepository;
import com.finapp.repository.TransactionRepository;
import com.finapp.repository.UserRepository;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ImportService {

    private final TradeRepository tradeRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final ImportFormatRepository importFormatRepository;
    private final BankPdfParser bankPdfParser;
    private final CreditCardParser creditCardParser;
    private final BrokerPdfParser brokerPdfParser;

    // ==================== TRADES IMPORT ====================

    public ImportResponseDTO importTrades(MultipartFile file, String format, String username, String brokerType, Long formatId, String password) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<TradeDTO> trades = parseTradesFile(file, format, brokerType, formatId, password);
        List<String> errors = new ArrayList<>();
        int imported = 0;

        for (int i = 0; i < trades.size(); i++) {
            try {
                TradeDTO dto = trades.get(i);
                Trade trade = new Trade();
                trade.setUser(user);
                trade.setStockName(dto.getStockName());
                trade.setSegment(dto.getSegment());
                trade.setTradeType(dto.getTradeType());
                trade.setPositionType(dto.getPositionType());
                trade.setQuantity(dto.getQuantity());
                trade.setBuyPrice(dto.getBuyPrice());
                trade.setSellPrice(dto.getSellPrice());
                trade.setInvestedAmount(dto.getInvestedAmount());
                trade.setReturnAmount(dto.getReturnAmount());
                trade.setProfitLoss(dto.getProfitLoss());
                trade.setProfitLossPercentage(dto.getProfitLossPercentage());
                trade.setBrokerage(dto.getBrokerage());
                trade.setStatus(dto.getStatus());
                trade.setEntryDate(dto.getEntryDate());
                trade.setExitDate(dto.getExitDate());
                trade.setNotes(dto.getNotes());
                trade.setBroker(dto.getBroker() != null ? dto.getBroker() : "ZERODHA");
                tradeRepository.save(trade);
                imported++;
            } catch (Exception e) {
                errors.add("Row " + (i + 1) + ": " + e.getMessage());
            }
        }

        return ImportResponseDTO.builder()
                .success(true).message("Imported " + imported + " trades successfully")
                .totalRows(trades.size()).importedCount(imported)
                .failedCount(errors.size()).errors(errors).isPreview(false).build();
    }

    public ImportResponseDTO previewTrades(MultipartFile file, String format, String brokerType, Long formatId, String password) {
        List<TradeDTO> trades = parseTradesFile(file, format, brokerType, formatId, password);
        List<Map<String, Object>> previewData = new ArrayList<>();
        for (TradeDTO trade : trades) {
            Map<String, Object> map = new HashMap<>();
            map.put("stockName", trade.getStockName());
            map.put("segment", trade.getSegment());
            map.put("tradeType", trade.getTradeType());
            map.put("quantity", trade.getQuantity());
            map.put("buyPrice", trade.getBuyPrice());
            map.put("sellPrice", trade.getSellPrice());
            map.put("investedAmount", trade.getInvestedAmount());
            map.put("profitLoss", trade.getProfitLoss());
            map.put("entryDate", trade.getEntryDate());
            map.put("status", trade.getStatus());
            previewData.add(map);
        }
        return ImportResponseDTO.builder()
                .success(true).message("Preview ready")
                .totalRows(trades.size()).previewData(previewData).isPreview(true).build();
    }

    private List<TradeDTO> parseTradesFile(MultipartFile file, String format, String brokerType, Long formatId, String password) {
        if (formatId != null) {
            ImportFormat fmt = importFormatRepository.findById(formatId).orElse(null);
            if (fmt != null) {
                if ("csv".equalsIgnoreCase(format)) return brokerPdfParser.parseCSVWithFormat(file, fmt);
                if ("excel".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format)) return brokerPdfParser.parseExcel(file, fmt, password);
            }
        }
        String bt = brokerType != null ? brokerType : "GENERIC";
        if ("csv".equalsIgnoreCase(format)) return brokerPdfParser.parseCSV(file, bt);
        if ("excel".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format)) return brokerPdfParser.parseExcel(file, bt, password);
        if ("pdf".equalsIgnoreCase(format)) return brokerPdfParser.parse(file, bt, password);
        throw new RuntimeException("Unsupported format: " + format);
    }

    // ==================== CC STATEMENT IMPORT ====================

    @Transactional
    public ImportResponseDTO importCCStatement(MultipartFile file, String format, String ccName, String username, Long formatId, String password) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Asset ccAsset = assetRepository.findByUserAndName(user, ccName).orElseGet(() -> {
            Asset a = new Asset();
            a.setUser(user); a.setName(ccName);
            a.setType(AssetType.LIABILITY); a.setCategory(AssetCategory.CREDIT_CARD);
            a.setValue(BigDecimal.ZERO);
            return assetRepository.save(a);
        });

        List<TransactionDTO> transactions;
        try { transactions = parseCCFile(file, format, formatId, password); }
        catch (RuntimeException e) {
            return ImportResponseDTO.builder().success(false).message(e.getMessage())
                    .errors(List.of(e.getMessage())).totalRows(0).importedCount(0).failedCount(0).isPreview(false).build();
        }

        Set<String> existingHashes = transactionRepository.findAllImportHashesByUser(user);
        LocalDate existingLatest = transactionRepository.findMaxDateByUserAndPaymentSource(user, ccName).orElse(LocalDate.MIN);
        LocalDate importMax = transactions.stream().map(TransactionDTO::getDate).filter(d -> d != null).max(LocalDate::compareTo).orElse(LocalDate.MIN);

        BigDecimal runningBalance = ccAsset.getValue() != null ? ccAsset.getValue() : BigDecimal.ZERO;
        BigDecimal latestBalance = null;
        LocalDate latestDate = LocalDate.MIN;
        List<Transaction> batch = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        int dupes = 0;

        for (int i = 0; i < transactions.size(); i++) {
            try {
                TransactionDTO dto = transactions.get(i);
                String hash = generateTxnHash(user.getId(), dto.getDate(), dto.getAmount(),
                        dto.getTitle() != null ? dto.getTitle() : dto.getDescription());
                if (existingHashes.contains(hash)) { dupes++; continue; }
                existingHashes.add(hash);

                runningBalance = dto.getType() == TransactionType.DEBIT
                    ? runningBalance.add(dto.getAmount()) : runningBalance.subtract(dto.getAmount());

                Transaction txn = new Transaction();
                txn.setUser(user);
                txn.setTitle(dto.getTitle() != null ? dto.getTitle() : dto.getDescription() != null ? dto.getDescription() : "Imported");
                txn.setDescription(dto.getDescription());
                txn.setAmount(dto.getAmount()); txn.setType(dto.getType());
                txn.setCategory(dto.getBudgetCategory() != null ? dto.getBudgetCategory() : "Uncategorized");
                txn.setDate(dto.getDate());
                txn.setBudgetCategory(dto.getBudgetCategory() != null ? dto.getBudgetCategory() : "Uncategorized");
                txn.setPaymentSource(ccName);
                txn.setImportHash(hash); txn.setBalanceAfter(runningBalance);
                batch.add(txn);

                if (dto.getDate() != null && !dto.getDate().isBefore(latestDate)) {
                    latestDate = dto.getDate(); latestBalance = runningBalance;
                }
            } catch (Exception e) { errors.add("Row " + (i + 1) + ": " + e.getMessage()); }
        }

        if (!batch.isEmpty()) transactionRepository.saveAll(batch);
        int imported = batch.size();
        if (imported > 0 && !importMax.isBefore(existingLatest) && latestBalance != null) {
            ccAsset.setValue(latestBalance); assetRepository.save(ccAsset);
        }

        String msg = "Imported " + imported + " transactions" + (dupes > 0 ? ", " + dupes + " duplicates skipped" : "");
        return ImportResponseDTO.builder().success(true).message(msg)
                .totalRows(transactions.size()).importedCount(imported)
                .failedCount(errors.size()).duplicatesSkipped(dupes).errors(errors).isPreview(false).build();
    }

    public ImportResponseDTO previewCCStatement(MultipartFile file, String format, Long formatId, String password) {
        List<TransactionDTO> transactions;
        try { transactions = parseCCFile(file, format, formatId, password); }
        catch (RuntimeException e) {
            return ImportResponseDTO.builder().success(false).message(e.getMessage())
                    .errors(List.of(e.getMessage())).totalRows(0).isPreview(true).build();
        }
        List<Map<String, Object>> previewData = new ArrayList<>();
        for (TransactionDTO txn : transactions) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("date", txn.getDate()); map.put("description", txn.getDescription());
            map.put("amount", txn.getAmount()); map.put("type", txn.getType());
            map.put("category", txn.getBudgetCategory());
            previewData.add(map);
        }
        return ImportResponseDTO.builder().success(true).message("Preview ready")
                .totalRows(transactions.size()).previewData(previewData).isPreview(true).build();
    }

    private List<TransactionDTO> parseCCFile(MultipartFile file, String format, Long formatId, String password) {
        ImportFormat fmt = formatId != null ? importFormatRepository.findById(formatId).orElse(null) : null;
        if (fmt == null) throw new RuntimeException("CC import format not found. Please select a format.");
        if ("excel".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format)) return creditCardParser.parseExcel(file, fmt, password);
        if ("csv".equalsIgnoreCase(format)) return creditCardParser.parseCSV(file, fmt);
        return creditCardParser.parsePdf(file, fmt, password);
    }

    // ==================== BANK STATEMENT IMPORT ====================

    @Transactional
    public ImportResponseDTO importBankStatement(MultipartFile file, String format, String bankName, String username, String bankType, Long formatId, String password) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Asset bankAsset = assetRepository.findByUserAndName(user, bankName).orElseGet(() -> {
            Asset asset = new Asset();
            asset.setUser(user); asset.setName(bankName);
            asset.setType(AssetType.ASSET); asset.setCategory(AssetCategory.BANK);
            asset.setValue(BigDecimal.ZERO);
            return assetRepository.save(asset);
        });

        List<TransactionDTO> transactions;
        try { transactions = parseBankStatementFile(file, format, bankName, bankType, formatId, password); }
        catch (RuntimeException e) {
            return ImportResponseDTO.builder().success(false).message(e.getMessage())
                    .errors(List.of(e.getMessage())).totalRows(0).importedCount(0).failedCount(0).isPreview(false).build();
        }

        Set<String> existingHashes = transactionRepository.findAllImportHashesByUser(user);
        LocalDate existingLatestDate = transactionRepository.findMaxDateByUserAndPaymentSource(user, bankName).orElse(LocalDate.MIN);
        LocalDate importMaxDate = transactions.stream().map(TransactionDTO::getDate).filter(d -> d != null).max(LocalDate::compareTo).orElse(LocalDate.MIN);

        BigDecimal runningBalance = bankAsset.getValue() != null ? bankAsset.getValue() : BigDecimal.ZERO;
        BigDecimal latestDateBalance = null;
        LocalDate latestDateSeen = LocalDate.MIN;
        List<Transaction> batch = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        int dupes = 0;

        for (int i = 0; i < transactions.size(); i++) {
            try {
                TransactionDTO dto = transactions.get(i);
                String hash = generateTxnHash(user.getId(), dto.getDate(), dto.getAmount(),
                        dto.getTitle() != null ? dto.getTitle() : dto.getDescription());
                if (existingHashes.contains(hash)) { dupes++; continue; }
                existingHashes.add(hash);

                runningBalance = dto.getType() == TransactionType.CREDIT
                    ? runningBalance.add(dto.getAmount()) : runningBalance.subtract(dto.getAmount());

                BigDecimal txnBalanceAfter = dto.getBalanceAfter() != null ? dto.getBalanceAfter() : runningBalance;

                Transaction txn = new Transaction();
                txn.setUser(user);
                txn.setTitle(dto.getTitle() != null ? dto.getTitle() : dto.getDescription() != null ? dto.getDescription() : "Imported");
                txn.setDescription(dto.getDescription());
                txn.setAmount(dto.getAmount()); txn.setType(dto.getType());
                txn.setCategory(dto.getBudgetCategory() != null ? dto.getBudgetCategory() : "Uncategorized");
                txn.setDate(dto.getDate());
                txn.setBudgetCategory(dto.getBudgetCategory() != null ? dto.getBudgetCategory() : "Uncategorized");
                txn.setPaymentSource(bankName);
                txn.setReferenceNumber(dto.getReferenceNumber());
                txn.setImportHash(hash); txn.setBalanceAfter(txnBalanceAfter);
                batch.add(txn);

                if (dto.getDate() != null && !dto.getDate().isBefore(latestDateSeen)) {
                    latestDateSeen = dto.getDate(); latestDateBalance = txnBalanceAfter;
                }
            } catch (Exception e) { errors.add("Row " + (i + 1) + ": " + e.getMessage()); }
        }

        if (!batch.isEmpty()) transactionRepository.saveAll(batch);
        int imported = batch.size();
        if (imported > 0 && !importMaxDate.isBefore(existingLatestDate) && latestDateBalance != null) {
            bankAsset.setValue(latestDateBalance); assetRepository.save(bankAsset);
        }

        String msg = "Imported " + imported + " transactions" + (dupes > 0 ? ", " + dupes + " duplicates skipped" : "");
        return ImportResponseDTO.builder().success(true).message(msg)
                .totalRows(transactions.size()).importedCount(imported)
                .failedCount(errors.size()).duplicatesSkipped(dupes).errors(errors).isPreview(false).build();
    }

    public ImportResponseDTO previewBankStatement(MultipartFile file, String format, String bankName, String bankType, Long formatId, String password) {
        List<TransactionDTO> transactions;
        try { transactions = parseBankStatementFile(file, format, bankName, bankType, formatId, password); }
        catch (RuntimeException e) {
            return ImportResponseDTO.builder().success(false).message(e.getMessage())
                    .errors(List.of(e.getMessage())).totalRows(0).isPreview(true).build();
        }
        List<Map<String, Object>> previewData = new ArrayList<>();
        for (TransactionDTO txn : transactions) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("date", txn.getDate()); map.put("description", txn.getDescription());
            map.put("amount", txn.getAmount()); map.put("type", txn.getType());
            if (txn.getBalanceAfter() != null) map.put("balance", txn.getBalanceAfter());
            map.put("category", txn.getBudgetCategory());
            previewData.add(map);
        }
        return ImportResponseDTO.builder().success(true).message("Preview ready")
                .totalRows(transactions.size()).previewData(previewData).isPreview(true).build();
    }

    private List<TransactionDTO> parseBankStatementFile(MultipartFile file, String format, String bankName, String bankType, Long formatId, String password) {
        if (formatId != null) {
            ImportFormat fmt = importFormatRepository.findById(formatId).orElse(null);
            if (fmt != null) {
                List<TransactionDTO> txns;
                if ("excel".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format))
                    txns = bankPdfParser.parseExcel(file, fmt, password);
                else if ("csv".equalsIgnoreCase(format))
                    txns = bankPdfParser.parseCSVWithFormat(file, fmt);
                else
                    txns = bankPdfParser.parse(file, resolvePdfBankType(fmt), password);
                txns.forEach(t -> t.setPaymentSource(bankName));
                return txns;
            }
        }
        String bt = bankType != null ? bankType : "GENERIC";
        List<TransactionDTO> txns;
        if ("csv".equalsIgnoreCase(format)) txns = bankPdfParser.parseCSV(file, bt);
        else if ("excel".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format)) txns = bankPdfParser.parseExcel(file, bt, password);
        else if ("pdf".equalsIgnoreCase(format)) txns = bankPdfParser.parse(file, bt, password);
        else throw new RuntimeException("Unsupported format: " + format);
        txns.forEach(t -> t.setPaymentSource(bankName));
        return txns;
    }

    private String resolvePdfBankType(ImportFormat fmt) {
        String name = fmt.getName() != null ? fmt.getName().toUpperCase() : "";
        if (name.contains("HDFC")) return "HDFC";
        if (name.contains("ICICI")) return "ICICI";
        if (name.contains("SBI")) return "SBI";
        // Also check if user named it something with bank keywords
        String desc = fmt.getDescriptionColumn() != null ? fmt.getDescriptionColumn().toUpperCase() : "";
        if (desc.contains("TRANSACTION REMARKS")) return "ICICI";
        if (desc.contains("NARRATION")) return "HDFC";
        return "GENERIC";
    }

    // ==================== JSON IMPORT ====================

    public ImportResponseDTO importBankStatementJson(String bankName, List<TransactionDTO> transactions, String username) {
        return importBankStatementJson(bankName, transactions, username, "BANK");
    }

    @Transactional
    public ImportResponseDTO importBankStatementJson(String bankName, List<TransactionDTO> transactions, String username, String accountType) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        AssetCategory assetCategory = "CREDIT_CARD".equalsIgnoreCase(accountType) ? AssetCategory.CREDIT_CARD : AssetCategory.BANK;

        Asset asset = assetRepository.findByUserAndName(user, bankName).orElseGet(() -> {
            Asset a = new Asset();
            a.setUser(user); a.setName(bankName);
            a.setType("CREDIT_CARD".equalsIgnoreCase(accountType) ? AssetType.LIABILITY : AssetType.ASSET);
            a.setCategory(assetCategory); a.setValue(BigDecimal.ZERO);
            return assetRepository.save(a);
        });

        Set<String> existingHashes = transactionRepository.findAllImportHashesByUser(user);
        LocalDate existingLatest = transactionRepository.findMaxDateByUserAndPaymentSource(user, bankName).orElse(LocalDate.MIN);
        LocalDate importMax = transactions.stream().map(dto -> dto.getDate() != null ? dto.getDate() : LocalDate.now()).max(LocalDate::compareTo).orElse(LocalDate.MIN);

        BigDecimal runningBalance = asset.getValue() != null ? asset.getValue() : BigDecimal.ZERO;
        BigDecimal latestBalance = null;
        LocalDate latestDate = LocalDate.MIN;
        List<Transaction> batch = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        int dupes = 0;

        for (int i = 0; i < transactions.size(); i++) {
            try {
                TransactionDTO dto = transactions.get(i);
                LocalDate txDate = dto.getDate() != null ? dto.getDate() : LocalDate.now();
                String hash = generateTxnHash(user.getId(), txDate, dto.getAmount(),
                        dto.getTitle() != null ? dto.getTitle() : dto.getDescription());
                if (existingHashes.contains(hash)) { dupes++; continue; }
                existingHashes.add(hash);

                TransactionType txType = dto.getType() != null ? dto.getType() : TransactionType.DEBIT;
                if (assetCategory == AssetCategory.BANK)
                    runningBalance = txType == TransactionType.CREDIT ? runningBalance.add(dto.getAmount()) : runningBalance.subtract(dto.getAmount());
                else
                    runningBalance = txType == TransactionType.DEBIT ? runningBalance.add(dto.getAmount()) : runningBalance.subtract(dto.getAmount());

                BigDecimal txnBalance = dto.getBalanceAfter() != null ? dto.getBalanceAfter() : runningBalance;

                Transaction txn = new Transaction();
                txn.setUser(user);
                txn.setTitle(dto.getTitle() != null ? dto.getTitle() : dto.getDescription() != null ? dto.getDescription() : "Imported");
                txn.setDescription(dto.getDescription());
                txn.setAmount(dto.getAmount()); txn.setType(txType);
                txn.setCategory(dto.getBudgetCategory() != null ? dto.getBudgetCategory() : "Uncategorized");
                txn.setDate(txDate);
                txn.setBudgetCategory(dto.getBudgetCategory() != null ? dto.getBudgetCategory() : "Uncategorized");
                txn.setPaymentSource(bankName);
                txn.setReferenceNumber(dto.getReferenceNumber());
                txn.setImportHash(hash); txn.setBalanceAfter(txnBalance);
                batch.add(txn);

                if (!txDate.isBefore(latestDate)) { latestDate = txDate; latestBalance = txnBalance; }
            } catch (Exception e) { errors.add("Row " + (i + 1) + ": " + e.getMessage()); }
        }

        if (!batch.isEmpty()) transactionRepository.saveAll(batch);
        int imported = batch.size();
        if (imported > 0 && !importMax.isBefore(existingLatest) && latestBalance != null) {
            asset.setValue(latestBalance); assetRepository.save(asset);
        }

        String msg = "Imported " + imported + " transactions" + (dupes > 0 ? ", " + dupes + " duplicates skipped" : "");
        return ImportResponseDTO.builder().success(true).message(msg)
                .totalRows(transactions.size()).importedCount(imported)
                .failedCount(errors.size()).duplicatesSkipped(dupes).errors(errors).isPreview(false).build();
    }

    public ImportResponseDTO importTradesJson(List<TradeDTO> trades, String username) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<String> errors = new ArrayList<>();
        int imported = 0;
        for (int i = 0; i < trades.size(); i++) {
            try {
                TradeDTO dto = trades.get(i);
                Trade trade = new Trade();
                trade.setUser(user);
                trade.setStockName(dto.getStockName());
                trade.setSegment(dto.getSegment() != null ? dto.getSegment() : TradeSegment.EQUITY);
                trade.setTradeType(dto.getTradeType() != null ? dto.getTradeType() : Trade.TradeType.LONG_TERM);
                trade.setPositionType(dto.getPositionType() != null ? dto.getPositionType() : Trade.PositionType.LONG);
                trade.setQuantity(dto.getQuantity());
                trade.setBuyPrice(dto.getBuyPrice()); trade.setSellPrice(dto.getSellPrice());
                trade.setInvestedAmount(dto.getInvestedAmount()); trade.setReturnAmount(dto.getReturnAmount());
                trade.setProfitLoss(dto.getProfitLoss()); trade.setProfitLossPercentage(dto.getProfitLossPercentage());
                trade.setBrokerage(dto.getBrokerage());
                trade.setStatus(dto.getStatus() != null ? dto.getStatus() : TradeStatus.OPEN);
                trade.setEntryDate(dto.getEntryDate() != null ? dto.getEntryDate() : LocalDate.now());
                trade.setExitDate(dto.getExitDate()); trade.setNotes(dto.getNotes());
                trade.setBroker(dto.getBroker() != null ? dto.getBroker() : "CUSTOM");
                tradeRepository.save(trade);
                imported++;
            } catch (Exception e) { errors.add("Row " + (i + 1) + ": " + e.getMessage()); }
        }
        return ImportResponseDTO.builder().success(true).message("Imported " + imported + " trades successfully")
                .totalRows(trades.size()).importedCount(imported).failedCount(errors.size()).errors(errors).isPreview(false).build();
    }

    // ==================== UTILITIES ====================

    private String generateTxnHash(Long userId, LocalDate date, BigDecimal amount, String title) {
        String raw = userId + "|" + date + "|" + (amount != null ? amount.toPlainString() : "0") + "|" + (title != null ? title.trim().toLowerCase() : "");
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) { return raw.hashCode() + ""; }
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        DateTimeFormatter[] formatters = {
            DateTimeFormatter.ofPattern("dd-MM-yyyy"), DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"), DateTimeFormatter.ofPattern("MM-dd-yyyy"),
        };
        for (DateTimeFormatter f : formatters) { try { return LocalDate.parse(dateStr, f); } catch (Exception ignored) {} }
        throw new RuntimeException("Invalid date format: " + dateStr);
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> DateUtil.isCellDateFormatted(cell) ? cell.getDateCellValue().toString() : String.valueOf(cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> "";
        };
    }
}
