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
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
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
    private final BrokerPdfParser brokerPdfParser;

    // ==================== TRADES IMPORT ====================

    public ImportResponseDTO importTrades(MultipartFile file, String format, String username) {
        return importTrades(file, format, username, null, null);
    }

    public ImportResponseDTO importTrades(MultipartFile file, String format, String username, String brokerType) {
        return importTrades(file, format, username, brokerType, null);
    }

    public ImportResponseDTO importTrades(MultipartFile file, String format, String username, String brokerType, Long formatId) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<TradeDTO> trades = parseTradesFile(file, format, brokerType, formatId);
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
                .success(true)
                .message("Imported " + imported + " trades successfully")
                .totalRows(trades.size())
                .importedCount(imported)
                .failedCount(errors.size())
                .errors(errors)
                .isPreview(false)
                .build();
    }

    public ImportResponseDTO previewTrades(MultipartFile file, String format) {
        return previewTrades(file, format, null, null);
    }

    public ImportResponseDTO previewTrades(MultipartFile file, String format, String brokerType) {
        return previewTrades(file, format, brokerType, null);
    }

    public ImportResponseDTO previewTrades(MultipartFile file, String format, String brokerType, Long formatId) {
        List<TradeDTO> trades = parseTradesFile(file, format, brokerType, formatId);
        List<Map<String, Object>> previewData = new ArrayList<>();

        for (TradeDTO trade : trades) {
            Map<String, Object> map = new HashMap<>();
            map.put("stockName", trade.getStockName());
            map.put("segment", trade.getSegment());
            map.put("tradeType", trade.getTradeType());
            map.put("positionType", trade.getPositionType());
            map.put("quantity", trade.getQuantity());
            map.put("buyPrice", trade.getBuyPrice());
            map.put("sellPrice", trade.getSellPrice());
            map.put("investedAmount", trade.getInvestedAmount());
            map.put("profitLoss", trade.getProfitLoss());
            map.put("entryDate", trade.getEntryDate());
            map.put("exitDate", trade.getExitDate());
            map.put("status", trade.getStatus());
            previewData.add(map);
        }

        return ImportResponseDTO.builder()
                .success(true)
                .message("Preview ready")
                .totalRows(trades.size())
                .previewData(previewData)
                .isPreview(true)
                .build();
    }

    private List<TradeDTO> parseTradesFile(MultipartFile file, String format, String brokerType, Long formatId) {
        String bt = brokerType != null ? brokerType : "GENERIC";

        // If formatId is provided, use custom format parsing
        if (formatId != null) {
            ImportFormat fmt = importFormatRepository.findById(formatId).orElse(null);
            if (fmt != null) {
                if ("csv".equalsIgnoreCase(format)) {
                    return brokerPdfParser.parseCSVWithFormat(file, fmt);
                } else if ("excel".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format)) {
                    return brokerPdfParser.parseExcel(file, fmt);
                }
            }
        }

        // Fallback to predefined broker formats
        if ("csv".equalsIgnoreCase(format)) {
            return brokerPdfParser.parseCSV(file, bt);
        } else if ("excel".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format)) {
            return brokerPdfParser.parseExcel(file, bt);
        } else if ("pdf".equalsIgnoreCase(format)) {
            return brokerPdfParser.parse(file, bt);
        }
        throw new RuntimeException("Unsupported format: " + format);
    }

    private List<TradeDTO> parseTradesCSV(MultipartFile file) {
        List<TradeDTO> trades = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
             CSVReader csvReader = new CSVReaderBuilder(reader).withSkipLines(1).build()) {

            String[] line;
            while ((line = csvReader.readNext()) != null) {
                if (line.length < 6) continue;

                TradeDTO dto = new TradeDTO();
                dto.setStockName(line[0]);
                dto.setSegment(TradeSegment.valueOf(line[1].toUpperCase()));
                dto.setTradeType(Trade.TradeType.valueOf(line[2].toUpperCase()));
                dto.setPositionType(Trade.PositionType.valueOf(line[3].toUpperCase()));
                dto.setQuantity(Integer.parseInt(line[4]));
                dto.setBuyPrice(new BigDecimal(line[5]));
                dto.setSellPrice(line.length > 6 && !line[6].isEmpty() ? new BigDecimal(line[6]) : null);
                dto.setInvestedAmount(new BigDecimal(line[5]).multiply(BigDecimal.valueOf(Integer.parseInt(line[4]))));
                dto.setBrokerage(line.length > 7 && !line[7].isEmpty() ? new BigDecimal(line[7]) : BigDecimal.ZERO);
                dto.setEntryDate(parseDate(line[8]));
                dto.setExitDate(line.length > 9 && !line[9].isEmpty() ? parseDate(line[9]) : null);
                dto.setProfitLoss(line.length > 10 && !line[10].isEmpty() ? new BigDecimal(line[10]) : null);
                dto.setStatus(line.length > 11 ? TradeStatus.valueOf(line[11].toUpperCase()) : TradeStatus.OPEN);
                dto.setNotes(line.length > 12 ? line[12] : "");

                trades.add(dto);
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing CSV: " + e.getMessage());
        }
        return trades;
    }

    private List<TradeDTO> parseTradesExcel(MultipartFile file) {
        List<TradeDTO> trades = new ArrayList<>();
        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                TradeDTO dto = new TradeDTO();
                dto.setStockName(getCellValue(row.getCell(0)));
                dto.setSegment(TradeSegment.valueOf(getCellValue(row.getCell(1)).toUpperCase()));
                dto.setTradeType(Trade.TradeType.valueOf(getCellValue(row.getCell(2)).toUpperCase()));
                dto.setPositionType(Trade.PositionType.valueOf(getCellValue(row.getCell(3)).toUpperCase()));
                dto.setQuantity(Integer.parseInt(getCellValue(row.getCell(4))));
                dto.setBuyPrice(new BigDecimal(getCellValue(row.getCell(5))));
                String sellPrice = getCellValue(row.getCell(6));
                dto.setSellPrice(sellPrice.isEmpty() ? null : new BigDecimal(sellPrice));
                dto.setInvestedAmount(dto.getBuyPrice().multiply(BigDecimal.valueOf(dto.getQuantity())));
                String brokerage = getCellValue(row.getCell(7));
                dto.setBrokerage(brokerage.isEmpty() ? BigDecimal.ZERO : new BigDecimal(brokerage));
                dto.setEntryDate(parseDate(getCellValue(row.getCell(8))));
                String exitDate = getCellValue(row.getCell(9));
                dto.setExitDate(exitDate.isEmpty() ? null : parseDate(exitDate));
                String pnl = getCellValue(row.getCell(10));
                dto.setProfitLoss(pnl.isEmpty() ? null : new BigDecimal(pnl));
                String status = getCellValue(row.getCell(11));
                dto.setStatus(status.isEmpty() ? TradeStatus.OPEN : TradeStatus.valueOf(status.toUpperCase()));
                dto.setNotes(getCellValue(row.getCell(12)));

                trades.add(dto);
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing Excel: " + e.getMessage());
        }
        return trades;
    }

    // ==================== BANK STATEMENT IMPORT ====================

    public ImportResponseDTO importBankStatement(MultipartFile file, String format, String bankName, String username) {
        return importBankStatement(file, format, bankName, username, null);
    }

    public ImportResponseDTO importBankStatement(MultipartFile file, String format, String bankName, String username, String bankType) {
        return importBankStatement(file, format, bankName, username, bankType, "BANK");
    }

    @Transactional
    public ImportResponseDTO importBankStatement(MultipartFile file, String format, String bankName, String username, String bankType, String accountType) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        AssetCategory assetCategory = "CREDIT_CARD".equalsIgnoreCase(accountType) ? AssetCategory.CREDIT_CARD : AssetCategory.BANK;

        // Find or create bank/credit card asset
        Asset bankAsset = assetRepository.findByUserAndName(user, bankName)
                .orElseGet(() -> {
                    Asset asset = new Asset();
                    asset.setUser(user);
                    asset.setName(bankName);
                    asset.setType(AssetType.ASSET);
                    asset.setCategory(assetCategory);
                    asset.setValue(BigDecimal.ZERO);
                    return assetRepository.save(asset);
                });

        List<TransactionDTO> transactions;
        try {
            transactions = parseBankStatementFile(file, format, bankName, bankType);
        } catch (RuntimeException e) {
            return ImportResponseDTO.builder()
                    .success(false)
                    .message(e.getMessage())
                    .errors(java.util.List.of(e.getMessage()))
                    .totalRows(0).importedCount(0).failedCount(0)
                    .isPreview(false).build();
        }
        List<String> errors = new ArrayList<>();
        int dupes = 0;

        // Pre-fetch all existing hashes in one query (avoids N DB round-trips)
        java.util.Set<String> existingHashes = transactionRepository.findAllImportHashesByUser(user);

        // Find the latest transaction date already stored for this asset
        LocalDate existingLatestDate = transactionRepository
                .findMaxDateByUserAndPaymentSource(user, bankName)
                .orElse(LocalDate.MIN);

        // Find the max date in the incoming batch to decide if balance update is warranted
        LocalDate importMaxDate = transactions.stream()
                .map(TransactionDTO::getDate)
                .filter(d -> d != null)
                .max(LocalDate::compareTo)
                .orElse(LocalDate.MIN);

        BigDecimal runningBalance = bankAsset.getValue() != null ? bankAsset.getValue() : BigDecimal.ZERO;
        BigDecimal latestDateBalance = null;
        LocalDate latestDateSeen = LocalDate.MIN;

        List<Transaction> batch = new ArrayList<>();

        for (int i = 0; i < transactions.size(); i++) {
            try {
                TransactionDTO dto = transactions.get(i);
                String hash = generateTxnHash(user.getId(), dto.getDate(), dto.getAmount(),
                        dto.getTitle() != null ? dto.getTitle() : dto.getDescription());
                if (existingHashes.contains(hash)) {
                    dupes++;
                    continue;
                }
                existingHashes.add(hash); // prevent dupes within same batch

                if (assetCategory == AssetCategory.BANK) {
                    runningBalance = dto.getType() == TransactionType.CREDIT
                        ? runningBalance.add(dto.getAmount())
                        : runningBalance.subtract(dto.getAmount());
                } else if (assetCategory == AssetCategory.CREDIT_CARD) {
                    runningBalance = dto.getType() == TransactionType.DEBIT
                        ? runningBalance.add(dto.getAmount())
                        : runningBalance.subtract(dto.getAmount());
                }

                BigDecimal txnBalanceAfter = dto.getBalanceAfter() != null ? dto.getBalanceAfter() : runningBalance;

                Transaction txn = new Transaction();
                txn.setUser(user);
                txn.setTitle(dto.getTitle() != null ? dto.getTitle() : dto.getDescription() != null ? dto.getDescription() : "Imported");
                txn.setDescription(dto.getDescription());
                txn.setAmount(dto.getAmount());
                txn.setType(dto.getType());
                txn.setCategory(dto.getBudgetCategory() != null ? dto.getBudgetCategory() : "Uncategorized");
                txn.setDate(dto.getDate());
                txn.setBudgetCategory(dto.getBudgetCategory() != null ? dto.getBudgetCategory() : "Uncategorized");
                txn.setPaymentSource(bankName);
                txn.setReferenceNumber(dto.getReferenceNumber());
                txn.setImportHash(hash);
                txn.setBalanceAfter(txnBalanceAfter);
                batch.add(txn);

                if (dto.getDate() != null && !dto.getDate().isBefore(latestDateSeen)) {
                    latestDateSeen = dto.getDate();
                    latestDateBalance = txnBalanceAfter;
                }
            } catch (Exception e) {
                errors.add("Row " + (i + 1) + ": " + e.getMessage());
            }
        }

        // Batch insert — single DB round-trip for all rows
        if (!batch.isEmpty()) {
            transactionRepository.saveAll(batch);
        }
        int imported = batch.size();

        if (imported > 0 && !importMaxDate.isBefore(existingLatestDate) && latestDateBalance != null) {
            bankAsset.setValue(latestDateBalance);
            assetRepository.save(bankAsset);
        }

        String msg = "Imported " + imported + " transactions" + (dupes > 0 ? ", " + dupes + " duplicates skipped" : "");
        return ImportResponseDTO.builder()
                .success(true)
                .message(msg)
                .totalRows(transactions.size())
                .importedCount(imported)
                .failedCount(errors.size())
                .duplicatesSkipped(dupes)
                .errors(errors)
                .isPreview(false)
                .build();
    }

    public ImportResponseDTO previewBankStatement(MultipartFile file, String format, String bankName) {
        return previewBankStatement(file, format, bankName, null);
    }

    public ImportResponseDTO previewBankStatement(MultipartFile file, String format, String bankName, String bankType) {
        List<TransactionDTO> transactions;
        try {
            transactions = parseBankStatementFile(file, format, bankName, bankType);
        } catch (RuntimeException e) {
            return ImportResponseDTO.builder()
                    .success(false)
                    .message(e.getMessage())
                    .errors(java.util.List.of(e.getMessage()))
                    .totalRows(0).isPreview(true).build();
        }
        List<Map<String, Object>> previewData = new ArrayList<>();

        for (TransactionDTO txn : transactions) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("date", txn.getDate());
            map.put("description", txn.getDescription());
            map.put("amount", txn.getAmount());
            map.put("type", txn.getType());
            if (txn.getBalanceAfter() != null) map.put("balance", txn.getBalanceAfter());
            map.put("category", txn.getBudgetCategory());
            previewData.add(map);
        }

        return ImportResponseDTO.builder()
                .success(true)
                .message("Preview ready")
                .totalRows(transactions.size())
                .previewData(previewData)
                .isPreview(true)
                .build();
    }

    private List<TransactionDTO> parseBankStatementFile(MultipartFile file, String format, String bankName, String bankType) {
        String bt = bankType != null ? bankType : "GENERIC";
        List<TransactionDTO> txns;
        if ("csv".equalsIgnoreCase(format)) {
            txns = bankPdfParser.parseCSV(file, bt);
        } else if ("excel".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format)) {
            txns = bankPdfParser.parseExcel(file, bt);
        } else if ("pdf".equalsIgnoreCase(format)) {
            txns = bankPdfParser.parse(file, bt);
        } else {
            throw new RuntimeException("Unsupported format: " + format);
        }
        txns.forEach(t -> t.setPaymentSource(bankName));
        return txns;
    }

    private List<TransactionDTO> parseBankStatementCSV(MultipartFile file, String bankName) {
        List<TransactionDTO> transactions = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
             CSVReader csvReader = new CSVReaderBuilder(reader).withSkipLines(1).build()) {

            String[] line;
            while ((line = csvReader.readNext()) != null) {
                if (line.length < 4) continue;

                TransactionDTO dto = new TransactionDTO();
                dto.setDate(parseDate(line[0]));
                dto.setDescription(line[1]);
                String debit = line.length > 2 ? line[2] : "";
                String credit = line.length > 3 ? line[3] : "";

                if (!debit.isEmpty() && !debit.equals("0")) {
                    dto.setAmount(new BigDecimal(debit));
                    dto.setType(TransactionType.DEBIT);
                } else if (!credit.isEmpty() && !credit.equals("0")) {
                    dto.setAmount(new BigDecimal(credit));
                    dto.setType(TransactionType.CREDIT);
                }

                dto.setTitle(line[1]);
                dto.setBudgetCategory(line.length > 4 ? line[4] : "Uncategorized");
                dto.setPaymentSource(bankName);

                transactions.add(dto);
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing CSV: " + e.getMessage());
        }
        return transactions;
    }

    private List<TransactionDTO> parseBankStatementExcel(MultipartFile file, String bankName) {
        List<TransactionDTO> transactions = new ArrayList<>();
        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                TransactionDTO dto = new TransactionDTO();
                dto.setDate(parseDate(getCellValue(row.getCell(0))));
                dto.setDescription(getCellValue(row.getCell(1)));
                String debit = getCellValue(row.getCell(2));
                String credit = getCellValue(row.getCell(3));

                if (!debit.isEmpty() && !debit.equals("0")) {
                    dto.setAmount(new BigDecimal(debit));
                    dto.setType(TransactionType.DEBIT);
                } else if (!credit.isEmpty() && !credit.equals("0")) {
                    dto.setAmount(new BigDecimal(credit));
                    dto.setType(TransactionType.CREDIT);
                }

                dto.setTitle(getCellValue(row.getCell(1)));
                dto.setBudgetCategory(getCellValue(row.getCell(4)));
                if (dto.getBudgetCategory().isEmpty()) {
                    dto.setBudgetCategory("Uncategorized");
                }
                dto.setPaymentSource(bankName);

                transactions.add(dto);
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing Excel: " + e.getMessage());
        }
        return transactions;
    }

    // ==================== UTILITIES ====================

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        try {
            // Try different formats
            DateTimeFormatter[] formatters = {
                DateTimeFormatter.ofPattern("dd-MM-yyyy"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd"),
                DateTimeFormatter.ofPattern("MM-dd-yyyy"),
            };
            for (DateTimeFormatter formatter : formatters) {
                try {
                    return LocalDate.parse(dateStr, formatter);
                } catch (Exception ignored) {}
            }
            throw new RuntimeException("Unable to parse date: " + dateStr);
        } catch (Exception e) {
            throw new RuntimeException("Invalid date format: " + dateStr);
        }
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                }
                return String.valueOf(cell.getNumericCellValue());
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return cell.getCellFormula();
            default:
                return "";
        }
    }

    // ==================== DEDUPLICATION HASH ====================

    private String generateTxnHash(Long userId, LocalDate date, BigDecimal amount, String title) {
        String raw = userId + "|" + date + "|" + (amount != null ? amount.toPlainString() : "0") + "|" + (title != null ? title.trim().toLowerCase() : "");
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return raw.hashCode() + "";
        }
    }

    // ==================== JSON IMPORT (custom client-parsed formats) ====================

    public ImportResponseDTO importBankStatementJson(String bankName, List<TransactionDTO> transactions, String username) {
        return importBankStatementJson(bankName, transactions, username, "BANK");
    }

    @Transactional
    public ImportResponseDTO importBankStatementJson(String bankName, List<TransactionDTO> transactions, String username, String accountType) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        AssetCategory assetCategory = "CREDIT_CARD".equalsIgnoreCase(accountType) ? AssetCategory.CREDIT_CARD : AssetCategory.BANK;

        Asset jsonAsset = assetRepository.findByUserAndName(user, bankName).orElseGet(() -> {
            Asset asset = new Asset();
            asset.setUser(user);
            asset.setName(bankName);
            asset.setType(AssetType.ASSET);
            asset.setCategory(assetCategory);
            asset.setValue(BigDecimal.ZERO);
            return assetRepository.save(asset);
        });

        List<String> errors = new ArrayList<>();
        int dupes = 0;

        java.util.Set<String> existingHashesJson = transactionRepository.findAllImportHashesByUser(user);

        LocalDate existingLatestDateJson = transactionRepository
                .findMaxDateByUserAndPaymentSource(user, bankName)
                .orElse(LocalDate.MIN);

        LocalDate importMaxDateJson = transactions.stream()
                .map(dto -> dto.getDate() != null ? dto.getDate() : LocalDate.now())
                .max(LocalDate::compareTo)
                .orElse(LocalDate.MIN);

        BigDecimal runningBalanceJson = jsonAsset.getValue() != null ? jsonAsset.getValue() : BigDecimal.ZERO;
        BigDecimal latestDateBalanceJson = null;
        LocalDate latestDateSeenJson = LocalDate.MIN;

        List<Transaction> batchJson = new ArrayList<>();

        for (int i = 0; i < transactions.size(); i++) {
            try {
                TransactionDTO dto = transactions.get(i);
                LocalDate txDate = dto.getDate() != null ? dto.getDate() : LocalDate.now();
                String hash = generateTxnHash(user.getId(), txDate, dto.getAmount(),
                        dto.getTitle() != null ? dto.getTitle() : dto.getDescription());
                if (existingHashesJson.contains(hash)) {
                    dupes++;
                    continue;
                }
                existingHashesJson.add(hash);

                TransactionType txType = dto.getType() != null ? dto.getType() : TransactionType.DEBIT;
                if (assetCategory == AssetCategory.BANK) {
                    runningBalanceJson = txType == TransactionType.CREDIT
                        ? runningBalanceJson.add(dto.getAmount())
                        : runningBalanceJson.subtract(dto.getAmount());
                } else if (assetCategory == AssetCategory.CREDIT_CARD) {
                    runningBalanceJson = txType == TransactionType.DEBIT
                        ? runningBalanceJson.add(dto.getAmount())
                        : runningBalanceJson.subtract(dto.getAmount());
                }

                BigDecimal txnBalanceAfter = dto.getBalanceAfter() != null ? dto.getBalanceAfter() : runningBalanceJson;

                Transaction txn = new Transaction();
                txn.setUser(user);
                txn.setTitle(dto.getTitle() != null ? dto.getTitle() : dto.getDescription() != null ? dto.getDescription() : "Imported");
                txn.setDescription(dto.getDescription());
                txn.setAmount(dto.getAmount());
                txn.setType(txType);
                txn.setCategory(dto.getBudgetCategory() != null ? dto.getBudgetCategory() : "Uncategorized");
                txn.setDate(txDate);
                txn.setBudgetCategory(dto.getBudgetCategory() != null ? dto.getBudgetCategory() : "Uncategorized");
                txn.setPaymentSource(bankName);
                txn.setReferenceNumber(dto.getReferenceNumber());
                txn.setImportHash(hash);
                txn.setBalanceAfter(txnBalanceAfter);
                batchJson.add(txn);

                if (!txDate.isBefore(latestDateSeenJson)) {
                    latestDateSeenJson = txDate;
                    latestDateBalanceJson = txnBalanceAfter;
                }
            } catch (Exception e) {
                errors.add("Row " + (i + 1) + ": " + e.getMessage());
            }
        }

        if (!batchJson.isEmpty()) {
            transactionRepository.saveAll(batchJson);
        }
        int imported = batchJson.size();

        if (imported > 0 && !importMaxDateJson.isBefore(existingLatestDateJson) && latestDateBalanceJson != null) {
            jsonAsset.setValue(latestDateBalanceJson);
            assetRepository.save(jsonAsset);
        }

        String msg = "Imported " + imported + " transactions" + (dupes > 0 ? ", " + dupes + " duplicates skipped" : "");
        return ImportResponseDTO.builder()
                .success(true)
                .message(msg)
                .totalRows(transactions.size())
                .importedCount(imported)
                .failedCount(errors.size())
                .duplicatesSkipped(dupes)
                .errors(errors)
                .isPreview(false)
                .build();
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
                trade.setBuyPrice(dto.getBuyPrice());
                trade.setSellPrice(dto.getSellPrice());
                trade.setInvestedAmount(dto.getInvestedAmount());
                trade.setReturnAmount(dto.getReturnAmount());
                trade.setProfitLoss(dto.getProfitLoss());
                trade.setProfitLossPercentage(dto.getProfitLossPercentage());
                trade.setBrokerage(dto.getBrokerage());
                trade.setStatus(dto.getStatus() != null ? dto.getStatus() : TradeStatus.OPEN);
                trade.setEntryDate(dto.getEntryDate() != null ? dto.getEntryDate() : LocalDate.now());
                trade.setExitDate(dto.getExitDate());
                trade.setNotes(dto.getNotes());
                trade.setBroker(dto.getBroker() != null ? dto.getBroker() : "CUSTOM");
                tradeRepository.save(trade);
                imported++;
            } catch (Exception e) {
                errors.add("Row " + (i + 1) + ": " + e.getMessage());
            }
        }

        return ImportResponseDTO.builder()
                .success(true)
                .message("Imported " + imported + " trades successfully")
                .totalRows(trades.size())
                .importedCount(imported)
                .failedCount(errors.size())
                .errors(errors)
                .isPreview(false)
                .build();
    }
}
