package com.finapp.service;

import com.finapp.dto.TransactionDTO;
import com.finapp.model.ImportFormat;
import com.finapp.model.TransactionType;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses official bank statement PDFs for SBI, ICICI, HDFC.
 *
 * Each bank has a unique table layout. We extract raw text from the PDF
 * and apply bank-specific regex patterns to find transaction rows.
 *
 * Typical statement formats:
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * SBI  : Date | Description | Ref No | Debit | Credit | Balance
 *        Date format: dd MMM yyyy  (e.g. 01 Jan 2024)
 *
 * ICICI: Date | Description | Debit | Credit | Balance
 *        Date format: dd/MM/yyyy   (e.g. 01/01/2024)
 *
 * HDFC : Date | Narration | Value Dt | Debit | Credit | Balance
 *        Date format: dd/MM/yy     (e.g. 01/01/24)
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 * NOTE: These parsers handle the standard digital (text-based) PDFs.
 * Password-protected or scanned/image PDFs are NOT supported.
 */
@Service
public class BankPdfParser {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(BankPdfParser.class);

    // â”€â”€ Amount pattern: optional commas, mandatory decimal (e.g. 1,23,456.78) â”€â”€
    private static final String AMT = "([\\d,]+\\.\\d{2})";

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PUBLIC API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public List<TransactionDTO> parse(MultipartFile file, String bankType) {
        return parse(file, bankType, null);
    }

    public List<TransactionDTO> parse(MultipartFile file, String bankType, String password) {
        String text = extractText(file, password);
        return switch (bankType.toUpperCase()) {
            case "SBI"   -> parseSbi(text);
            case "ICICI" -> parseIcici(text);
            case "HDFC"  -> parseHdfc(text);
            default      -> parseGeneric(text);
        };
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ TEXT EXTRACT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private String extractText(MultipartFile file) {
        return extractText(file, null);
    }

    private String extractText(MultipartFile file, String password) {
        try {
            byte[] bytes = file.getInputStream().readAllBytes();
            org.apache.pdfbox.pdfparser.PDFParser parser;
            PDDocument doc;
            if (password != null && !password.isBlank()) {
                doc = Loader.loadPDF(bytes, password);
            } else {
                doc = Loader.loadPDF(bytes);
            }
            try (doc) {
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setSortByPosition(true);
                return stripper.getText(doc);
            }
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            if (msg.toLowerCase().contains("password") || msg.toLowerCase().contains("encrypt")) {
                throw new RuntimeException("PDF is password protected. Please provide the correct password.");
            }
            throw new RuntimeException("Could not read PDF. Make sure it is a text-based (not scanned) PDF. Error: " + msg);
        }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SBI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Row: 01 Jan 2024   UPI/123456/Description   REF123   1000.00        50000.00
    //   OR 01 Jan 2024   UPI/Description                            500.00 50000.00
    private List<TransactionDTO> parseSbi(String text) {
        List<TransactionDTO> list = new ArrayList<>();
        // date: dd MMM yyyy or dd-MMM-yyyy
        Pattern row = Pattern.compile(
            "(\\d{2}[\\s-][A-Za-z]{3}[\\s-]\\d{4})\\s+" +   // date
            "(.+?)\\s+" +                                       // narration
            AMT + "\\s+" +                                      // debit or credit (first amount)
            "(?:" + AMT + "\\s+)?" +                           // optional second amount
            AMT,                                                // balance (last amount)
            Pattern.DOTALL
        );
        // simpler line-by-line approach: lines that start with a date
        Pattern lineDate = Pattern.compile(
            "^(\\d{2}[\\s/-][A-Za-z]{3}[\\s/-]\\d{4})\\s+(.+?)\\s+" + AMT + "(?:\\s+" + AMT + ")?\\s+" + AMT + "\\s*$"
        );
        for (String line : text.split("\\r?\\n")) {
            line = line.trim();
            Matcher m = lineDate.matcher(line);
            if (!m.matches()) continue;
            try {
                LocalDate date   = parseDateMulti(m.group(1).replace(" ", "-").replace("/", "-"));
                String   narr    = m.group(2).trim();
                String   first   = m.group(3);   // debit or credit
                String   second  = m.group(4);   // credit or null
                // balance is last; if two amounts before balance â†’ debit then credit
                // if one amount before balance â†’ determine by context keywords
                TransactionDTO dto = new TransactionDTO();
                dto.setDate(date);
                dto.setTitle(narr);
                dto.setDescription(narr);
                if (second != null && !second.isEmpty()) {
                    // first = debit (spent), second = credit (received)
                    BigDecimal debit  = parseMoney(first);
                    BigDecimal credit = parseMoney(second);
                    if (debit.compareTo(BigDecimal.ZERO) > 0) {
                        dto.setAmount(debit);
                        dto.setType(TransactionType.DEBIT);
                    } else {
                        dto.setAmount(credit);
                        dto.setType(TransactionType.CREDIT);
                    }
                } else {
                    dto.setAmount(parseMoney(first));
                    dto.setType(isCreditNarration(narr) ? TransactionType.CREDIT : TransactionType.DEBIT);
                }
                dto.setBudgetCategory(guessCategory(narr));
                list.add(dto);
            } catch (Exception ignored) {}
        }
        return list;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ICICI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Row: 01/01/2024   UPI-Description   1000.00      50000.00
    //   OR 01/01/2024   NEFT-Description              500.00  50000.00
    private List<TransactionDTO> parseIcici(String text) {
        List<TransactionDTO> list = new ArrayList<>();
        Pattern line = Pattern.compile(
            "^(\\d{2}/\\d{2}/\\d{4})\\s+(.+?)\\s+" + AMT + "(?:\\s+" + AMT + ")?\\s+" + AMT + "\\s*$"
        );
        for (String l : text.split("\\r?\\n")) {
            Matcher m = line.matcher(l.trim());
            if (!m.matches()) continue;
            try {
                LocalDate date   = parseDateMulti(m.group(1).replace("/", "-"));
                String    narr   = m.group(2).trim();
                String    first  = m.group(3);
                String    second = m.group(4);
                TransactionDTO dto = new TransactionDTO();
                dto.setDate(date);
                dto.setTitle(narr);
                dto.setDescription(narr);
                if (second != null && !second.isEmpty()) {
                    BigDecimal debit  = parseMoney(first);
                    BigDecimal credit = parseMoney(second);
                    if (debit.compareTo(BigDecimal.ZERO) > 0) { dto.setAmount(debit);  dto.setType(TransactionType.DEBIT);  }
                    else                                        { dto.setAmount(credit); dto.setType(TransactionType.CREDIT); }
                } else {
                    dto.setAmount(parseMoney(first));
                    dto.setType(isCreditNarration(narr) ? TransactionType.CREDIT : TransactionType.DEBIT);
                }
                dto.setBudgetCategory(guessCategory(narr));
                list.add(dto);
            } catch (Exception ignored) {}
        }
        return list;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ HDFC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Row: 01/01/24  UPI-Description  01/01/24  1000.00   50000.00
    //   OR 01/01/24  NEFT-Description 01/01/24           500.00  50000.00
    private List<TransactionDTO> parseHdfc(String text) {
        List<TransactionDTO> list = new ArrayList<>();
        Pattern line = Pattern.compile(
            "^(\\d{2}/\\d{2}/\\d{2,4})\\s+(.+?)\\s+\\d{2}/\\d{2}/\\d{2,4}\\s+" +
            AMT + "(?:\\s+" + AMT + ")?\\s+" + AMT + "\\s*$"
        );
        for (String l : text.split("\\r?\\n")) {
            Matcher m = line.matcher(l.trim());
            if (!m.matches()) continue;
            try {
                LocalDate date   = parseDateMulti(m.group(1).replace("/", "-"));
                String    narr   = m.group(2).trim();
                String    first  = m.group(3);
                String    second = m.group(4);
                TransactionDTO dto = new TransactionDTO();
                dto.setDate(date);
                dto.setTitle(narr);
                dto.setDescription(narr);
                if (second != null && !second.isEmpty()) {
                    BigDecimal debit  = parseMoney(first);
                    BigDecimal credit = parseMoney(second);
                    if (debit.compareTo(BigDecimal.ZERO) > 0) { dto.setAmount(debit);  dto.setType(TransactionType.DEBIT);  }
                    else                                        { dto.setAmount(credit); dto.setType(TransactionType.CREDIT); }
                } else {
                    dto.setAmount(parseMoney(first));
                    dto.setType(isCreditNarration(narr) ? TransactionType.CREDIT : TransactionType.DEBIT);
                }
                dto.setBudgetCategory(guessCategory(narr));
                list.add(dto);
            } catch (Exception ignored) {}
        }
        return list;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ GENERIC FALLBACK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Tries to find any line with a date-like prefix followed by amounts
    private List<TransactionDTO> parseGeneric(String text) {
        List<TransactionDTO> list = new ArrayList<>();
        Pattern line = Pattern.compile(
            "^(\\d{2}[/\\-.][\\d]{2}[/\\-.][\\d]{2,4})\\s+(.+?)\\s+" + AMT + "(?:\\s+" + AMT + ")?\\s*$"
        );
        for (String l : text.split("\\r?\\n")) {
            Matcher m = line.matcher(l.trim());
            if (!m.matches()) continue;
            try {
                LocalDate date  = parseDateMulti(m.group(1).replace("/", "-").replace(".", "-"));
                String    narr  = m.group(2).trim();
                TransactionDTO dto = new TransactionDTO();
                dto.setDate(date);
                dto.setTitle(narr);
                dto.setDescription(narr);
                dto.setAmount(parseMoney(m.group(3)));
                dto.setType(isCreditNarration(narr) ? TransactionType.CREDIT : TransactionType.DEBIT);
                dto.setBudgetCategory(guessCategory(narr));
                list.add(dto);
            } catch (Exception ignored) {}
        }
        return list;
    }



    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private LocalDate parseDateMulti(String s) {
        s = s.trim().replace(',', '.'); // Handle dd,MM,yyyy format (commas to dots)
        DateTimeFormatter[] fmts = {
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yy"),
            DateTimeFormatter.ofPattern("dd-MMM-yyyy"),
            DateTimeFormatter.ofPattern("dd-MMM-yy"),
            DateTimeFormatter.ofPattern("dd MMM yyyy"),
            DateTimeFormatter.ofPattern("dd MMM yy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd.MM.yyyy"), // ICICI Excel format
            DateTimeFormatter.ofPattern("dd.MM.yy"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd/MM/yy"),
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("d-M-yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
        };
        for (DateTimeFormatter f : fmts) {
            try { return LocalDate.parse(s, f); } catch (Exception ignored) {}
        }
        throw new RuntimeException("Cannot parse date: " + s);
    }

    private BigDecimal parseMoney(String s) {
        if (s == null || s.isBlank()) return BigDecimal.ZERO;
        return new BigDecimal(s.replaceAll(",", "").trim());
    }

    private BigDecimal parseMoneySafe(String s) {
        try {
            if (s == null || s.isBlank()) return null;
            return new BigDecimal(s.replaceAll(",", "").trim());
        } catch (Exception e) {
            return null;
        }
    }

    /** Keywords that indicate a credit (money received) narration */
    private boolean isCreditNarration(String narr) {
        String n = narr.toUpperCase();
        return n.contains("CREDIT") || n.contains("SALARY") || n.contains("REFUND")
            || n.contains("CASHBACK") || n.contains("INTEREST") || n.contains("NEFT CR")
            || n.contains("RTGS CR") || n.contains("IMPS CR") || n.contains("INB CR")
            || n.contains("ATM CR") || n.contains("REV-") || n.contains("REVERSAL");
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  CSV PARSING WITH CUSTOM ImportFormat
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    public List<TransactionDTO> parseCSVWithFormat(MultipartFile file, ImportFormat fmt) {
        List<TransactionDTO> list = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
             CSVReader csv = new CSVReaderBuilder(reader).withSkipLines(0).build()) {
            int skip = fmt.getSkipRows() != null ? fmt.getSkipRows() : 1;
            List<String[]> allRows = csv.readAll();
            if (allRows.size() <= skip) return list;
            // scan for header row (don't assume fixed skip)
            Map<String, Integer> colIndex = null;
            int dataStart = skip;
            for (int i = 0; i < Math.min(skip + 5, allRows.size()); i++) {
                Map<String, Integer> candidate = new java.util.LinkedHashMap<>();
                String[] hdr = allRows.get(i);
                for (int j = 0; j < hdr.length; j++)
                    if (hdr[j] != null && !hdr[j].isBlank()) candidate.put(hdr[j].trim().toLowerCase(), j);
                if (isHeaderRow(candidate, fmt)) { colIndex = candidate; dataStart = i + 1; break; }
            }
            if (colIndex == null) {
                // fallback: use row at (skip-1) as header
                String[] hdr = allRows.get(skip - 1);
                colIndex = new java.util.LinkedHashMap<>();
                for (int j = 0; j < hdr.length; j++)
                    if (hdr[j] != null && !hdr[j].isBlank()) colIndex.put(hdr[j].trim().toLowerCase(), j);
            }
            DateTimeFormatter dateFmt = fmt.getDateFormat() != null
                ? DateTimeFormatter.ofPattern(fmt.getDateFormat()) : null;
            for (int i = dataStart; i < allRows.size(); i++) {
                String[] r = allRows.get(i);
                try {
                    String dateStr = getColFuzzy(r, colIndex, fmt.getDateColumn());
                    if (dateStr.isBlank()) continue;
                    String desc   = getColFuzzy(r, colIndex, fmt.getDescriptionColumn());
                    String debit  = getColFuzzy(r, colIndex, fmt.getDebitColumn());
                    String credit = getColFuzzy(r, colIndex, fmt.getCreditColumn());
                    String bal    = getColFuzzy(r, colIndex, fmt.getBalanceColumn());
                    TransactionDTO dto = new TransactionDTO();
                    try {
                        dto.setDate(dateFmt != null ? LocalDate.parse(dateStr, dateFmt) : parseDateMulti(dateStr));
                    } catch (Exception e) { dto.setDate(parseDateMulti(dateStr)); }
                    dto.setTitle(desc); dto.setDescription(desc);
                    setDebitCredit(dto, debit, credit, desc);
                    if (!bal.isBlank()) dto.setBalanceAfter(parseMoneySafe(bal));
                    dto.setBudgetCategory(guessCategory(desc));
                    if (dto.getAmount() != null && dto.getAmount().compareTo(BigDecimal.ZERO) != 0)
                        list.add(dto);
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing bank CSV: " + e.getMessage());
        }
        return list;
    }

    private String getColVal(String[] r, Map<String, Integer> colIndex, String colName) {
        if (colName == null) return "";
        Integer idx = colIndex.get(colName.trim().toLowerCase());
        if (idx == null || idx >= r.length) return "";
        return r[idx] == null ? "" : r[idx].trim();
    }
    /**
     * Parse a bank statement CSV with the correct column layout for each bank.
     *
     * SBI   : Date(dd MMM yyyy), Description, Ref No, Debit, Credit, Balance
     * ICICI : S.No., Value Date(dd/MM/yyyy), Description, Debit, Credit, Balance
     * HDFC  : Date(dd/MM/yy), Narration, Value Dt, Debit Amt, Credit Amt, Balance
     * GENERIC/CUSTOM : Date, Description, Debit, Credit [, Category]
     */
    public List<TransactionDTO> parseCSV(MultipartFile file, String bankType) {
        List<TransactionDTO> list = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
             CSVReader csv = new CSVReaderBuilder(reader).withSkipLines(1).build()) {
            String[] row;
            while ((row = csv.readNext()) != null) {
                if (row.length < 4) continue;
                try {
                    TransactionDTO dto = mapBankCsvRow(row, bankType);
                    if (dto != null) list.add(dto);
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing bank CSV: " + e.getMessage());
        }
        return list;
    }

    private TransactionDTO mapBankCsvRow(String[] r, String bankType) {
        TransactionDTO dto = new TransactionDTO();
        switch (bankType == null ? "GENERIC" : bankType.toUpperCase()) {
            case "SBI" -> {
                // Col: 0=Date(dd MMM yyyy / dd-MMM-yyyy), 1=Description, 2=RefNo, 3=Debit, 4=Credit, 5=Balance
                dto.setDate(parseDateMulti(r[0].trim()));
                dto.setTitle(r[1].trim()); dto.setDescription(r[1].trim());
                if (r.length > 2 && !r[2].isBlank()) dto.setReferenceNumber(r[2].trim());
                String debit  = r.length > 3 ? r[3].trim() : "";
                String credit = r.length > 4 ? r[4].trim() : "";
                setDebitCredit(dto, debit, credit, r[1]);
                if (r.length > 5 && !r[5].isBlank()) dto.setBalanceAfter(parseMoneySafe(r[5].trim()));
            }
            case "ICICI" -> {
                // ICICI Excel: 0=Empty, 1=S.No, 2=Value Date, 3=Transaction Date, 4=Cheque No, 5=Description, 6=Withdrawal(Debit), 7=Deposit(Credit), 8=Balance
                dto.setDate(parseDateMulti(r[2].trim()));
                dto.setTitle(r[5].trim()); dto.setDescription(r[5].trim());
                dto.setReferenceNumber(r[4].isBlank() ? r[1].trim() : r[4].trim()); // Cheque No or S.No
                String debit  = r.length > 6 ? r[6].trim() : "";
                String credit = r.length > 7 ? r[7].trim() : "";
                setDebitCredit(dto, debit, credit, r[5]);
                if (r.length > 8 && !r[8].isBlank()) dto.setBalanceAfter(parseMoneySafe(r[8].trim()));
            }
            case "HDFC" -> {
                // Col: 0=Date(dd/MM/yy), 1=Narration, 2=Value Dt, 3=Debit, 4=Credit, 5=Balance [, 6=Chq/Ref No]
                dto.setDate(parseDateMulti(r[0].trim()));
                dto.setTitle(r[1].trim()); dto.setDescription(r[1].trim());
                if (r.length > 6 && !r[6].isBlank()) dto.setReferenceNumber(r[6].trim());
                String debit  = r.length > 3 ? r[3].trim() : "";
                String credit = r.length > 4 ? r[4].trim() : "";
                setDebitCredit(dto, debit, credit, r[1]);
                if (r.length > 5 && !r[5].isBlank()) dto.setBalanceAfter(parseMoneySafe(r[5].trim()));
            }
            default -> {
                // Generic: Date, Description, Debit, Credit [, Category [, RefNo [, Balance]]]
                dto.setDate(parseDateMulti(r[0].trim()));
                dto.setTitle(r[1].trim()); dto.setDescription(r[1].trim());
                String debit  = r.length > 2 ? r[2].trim() : "";
                String credit = r.length > 3 ? r[3].trim() : "";
                setDebitCredit(dto, debit, credit, r[1]);
                if (r.length > 4 && !r[4].isBlank()) dto.setBudgetCategory(r[4].trim());
                if (r.length > 5 && !r[5].isBlank()) dto.setReferenceNumber(r[5].trim());
                if (r.length > 6 && !r[6].isBlank()) dto.setBalanceAfter(parseMoneySafe(r[6].trim()));
                if (dto.getBudgetCategory() != null) return dto;
            }
        }
        dto.setBudgetCategory(guessCategory(dto.getTitle()));
        return dto;
    }

    private void setDebitCredit(TransactionDTO dto, String debit, String credit, String narr) {
        boolean hasDebit  = !debit.isBlank()  && !debit.equals("0")  && !debit.equals("0.00");
        boolean hasCredit = !credit.isBlank() && !credit.equals("0") && !credit.equals("0.00");
        if (hasDebit) {
            dto.setAmount(parseMoney(debit));  dto.setType(TransactionType.DEBIT);
        } else if (hasCredit) {
            dto.setAmount(parseMoney(credit)); dto.setType(TransactionType.CREDIT);
        } else {
            dto.setAmount(BigDecimal.ZERO);
            dto.setType(isCreditNarration(narr) ? TransactionType.CREDIT : TransactionType.DEBIT);
        }
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  EXCEL PARSING (bank-specific column layouts)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    public List<TransactionDTO> parseExcel(MultipartFile file, String bankType) {
        return parseExcel(file, bankType, null);
    }

    public List<TransactionDTO> parseExcel(MultipartFile file, String bankType, String password) {
        List<TransactionDTO> list = new ArrayList<>();
        try (Workbook wb = (password != null && !password.isBlank())
                 ? openEncryptedWorkbook(file.getInputStream(), password) : WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            boolean dataStarted = false;
            for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String[] r = rowToStrings(row, 10);
                if (!dataStarted) {
                    if (isDataRow(r, bankType)) dataStarted = true;
                    else continue;
                }
                try {
                    TransactionDTO dto = mapBankCsvRow(r, bankType);
                    if (dto != null && dto.getDate() != null && dto.getAmount() != null
                        && dto.getAmount().compareTo(BigDecimal.ZERO) != 0) {
                        list.add(dto);
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing bank Excel: " + e.getMessage());
        }
        return list;
    }

    /** Parse Excel using a custom ImportFormat â€” column names resolved from header row */
    public List<TransactionDTO> parseExcel(MultipartFile file, ImportFormat fmt) {
        return parseExcel(file, fmt, null);
    }

    public List<TransactionDTO> parseExcel(MultipartFile file, ImportFormat fmt, String password) {
        List<TransactionDTO> list = new ArrayList<>();
        try (Workbook wb = (password != null && !password.isBlank())
                 ? openEncryptedWorkbook(file.getInputStream(), password) : WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            int skip = fmt.getSkipRows() != null ? fmt.getSkipRows() : 1;
            // Find header row: scan until we find a row whose first non-empty cell
            // matches one of the configured column names
            Map<String, Integer> colIndex = null;
            int dataStartRow = -1;
            for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String[] r = rowToStrings(row, 15);
                Map<String, Integer> candidate = buildColIndex(r);
                if (isHeaderRow(candidate, fmt)) {
                    colIndex = candidate;
                    dataStartRow = i + 1;
                    break;
                }
            }
            if (colIndex == null) {
            // Fallback: use first non-empty row as header
            for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                Row r2 = sheet.getRow(i);
                if (r2 == null) continue;
                String[] hdr = rowToStrings(r2, 15);
                Map<String, Integer> candidate = buildColIndex(hdr);
                if (!candidate.isEmpty()) { colIndex = candidate; dataStartRow = i + 1; break; }
            }
            if (colIndex == null) throw new RuntimeException("Could not find header row. Format expects: date=" + fmt.getDateColumn() + ", debit=" + fmt.getDebitColumn());
            log.warn("isHeaderRow match failed — using first non-empty row as fallback header: {}", colIndex.keySet());
        }
            DateTimeFormatter dateFmt = fmt.getDateFormat() != null
                ? DateTimeFormatter.ofPattern(fmt.getDateFormat()) : null;
            for (int i = dataStartRow; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String[] r = rowToStrings(row, 15);
                try {
                    TransactionDTO dto = mapRowWithFormat(r, colIndex, fmt, dateFmt);
                    if (dto != null && dto.getDate() != null && dto.getAmount() != null
                        && dto.getAmount().compareTo(BigDecimal.ZERO) != 0) {
                        list.add(dto);
                    }
                } catch (Exception ignored) {}
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Error parsing bank Excel: " + e.getMessage());
        }
        return list;
    }

    private Map<String, Integer> buildColIndex(String[] headers) {
        Map<String, Integer> map = new java.util.LinkedHashMap<>();
        for (int i = 0; i < headers.length; i++) {
            if (!headers[i].isBlank()) map.put(headers[i].trim().toLowerCase(), i);
        }
        return map;
    }

    private boolean isHeaderRow(Map<String, Integer> candidate, ImportFormat fmt) {
        // Simple rule: date column must be present (exact normalized match)
        // This prevents summary rows like "opening balance, total debit..." from being picked
        if (fmt.getDateColumn() == null) return false;
        String target = normalize(fmt.getDateColumn());
        for (String k : candidate.keySet()) {
            if (normalize(k).equals(target)) return true;
        }
        return false;
    }

    // Normalize: lowercase, collapse spaces, remove special chars for fuzzy matching
    private String normalize(String s) {
        return s.toLowerCase().replaceAll("[^a-z0-9]", " ").replaceAll("\\s+", " ").trim();
    }

    private boolean containsKeyPartial(Map<String, Integer> candidate, String colName) {
        String target = normalize(colName);
        for (String k : candidate.keySet()) {
            if (normalize(k).equals(target)) return true;
        }
        return false;
    }

    private Integer resolveColIndex(Map<String, Integer> colIndex, String colName) {
        if (colName == null) return null;
        String target = normalize(colName);
        for (Map.Entry<String, Integer> e : colIndex.entrySet()) {
            if (normalize(e.getKey()).equals(target)) return e.getValue();
        }
        return null;
    }

    private TransactionDTO mapRowWithFormat(String[] r, Map<String, Integer> colIndex, ImportFormat fmt, DateTimeFormatter dateFmt) {
        String dateStr = getColFuzzy(r, colIndex, fmt.getDateColumn());
        if (dateStr.isBlank()) return null;
        String desc   = getColFuzzy(r, colIndex, fmt.getDescriptionColumn());
        String debit  = getColFuzzy(r, colIndex, fmt.getDebitColumn());
        String credit = getColFuzzy(r, colIndex, fmt.getCreditColumn());
        String balStr = getColFuzzy(r, colIndex, fmt.getBalanceColumn());
        TransactionDTO dto = new TransactionDTO();
        try {
            dto.setDate(dateFmt != null ? LocalDate.parse(dateStr, dateFmt) : parseDateMulti(dateStr));
        } catch (Exception e) {
            // try ISO format from Excel date cells (yyyy-MM-dd)
            dto.setDate(parseDateMulti(dateStr));
        }
        dto.setTitle(desc); dto.setDescription(desc);
        setDebitCredit(dto, debit, credit, desc);
        if (!balStr.isBlank()) dto.setBalanceAfter(parseMoneySafe(balStr));
        dto.setBudgetCategory(guessCategory(desc));
        return dto;
    }

    private String getColFuzzy(String[] r, Map<String, Integer> colIndex, String colName) {
        if (colName == null) return "";
        Integer idx = resolveColIndex(colIndex, colName);
        if (idx == null || idx >= r.length) return "";
        return r[idx] == null ? "" : r[idx].trim();
    }

    private String getCol(String[] r, Map<String, Integer> colIndex, String colName) {
        if (colName == null) return "";
        Integer idx = colIndex.get(colName.trim().toLowerCase());
        if (idx == null || idx >= r.length) return "";
        return r[idx] == null ? "" : r[idx].trim();
    }

    private boolean isDataRow(String[] r, String bankType) {
        if (r.length < 3) return false;
        String firstCell = r[0].trim();
        String secondCell = r.length > 1 ? r[1].trim() : "";
        // Skip text headers like "S No.", "S.No", "Serial" in any column
        if (firstCell.toUpperCase().contains("S NO") || firstCell.toUpperCase().contains("SERIAL") ||
            secondCell.toUpperCase().contains("S NO") || secondCell.toUpperCase().contains("SERIAL")) {
            return false;
        }
        // For ICICI Excel: serial number is at index 1 (not 0), date at index 2
        if ("ICICI".equalsIgnoreCase(bankType)) {
            if (secondCell.matches("\\d{1,6}") && secondCell.length() <= 6) {
                // Check index 2 (Value Date) and 3 (Transaction Date) for dates
                if (r.length > 2 && looksLikeDate(r[2])) return true;
                if (r.length > 3 && looksLikeDate(r[3])) return true;
            }
            return false;
        }
        // For other banks: first cell is date or serial + date
        if (firstCell.matches("\\d{1,6}") && firstCell.length() <= 6) {
            for (int i = 1; i < Math.min(r.length, 5); i++) {
                if (looksLikeDate(r[i])) return true;
            }
        }
        return looksLikeDate(firstCell);
    }

    private boolean looksLikeDate(String s) {
        if (s == null || s.isEmpty()) return false;
        s = s.trim();
        // Common date patterns: dd/MM/yyyy, dd-MM-yyyy, dd.MMM.yyyy, dd,MM,yyyy (with commas)
        return s.matches("\\d{1,4}[/,\\-\\.]\\d{1,2}[/,\\-\\.]\\d{1,4}") ||
               s.matches("\\d{1,2}[-\\s][A-Za-z]{3}[-\\s]\\d{2,4}");
    }

    private String[] rowToStrings(Row row, int maxCols) {
        String[] arr = new String[maxCols];
        for (int c = 0; c < maxCols; c++) {
            Cell cell = row.getCell(c);
            arr[c] = cell == null ? "" : getCellStr(cell);
        }
        return arr;
    }

    private String getCellStr(Cell cell) {
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> DateUtil.isCellDateFormatted(cell)
                ? cell.getLocalDateTimeCellValue().toLocalDate().toString()
                : formatNumericCell(cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> getFormulaCellValue(cell);
            default      -> "";
        };
    }

    private String formatNumericCell(double value) {
        // Avoid scientific notation for large numbers
        if (value == Math.floor(value)) {
            return String.format("%.0f", value);
        }
        return String.format("%.2f", value);
    }

    private String getFormulaCellValue(Cell cell) {
        try {
            return switch (cell.getCachedFormulaResultType()) {
                case STRING -> cell.getStringCellValue().trim();
                case NUMERIC -> DateUtil.isCellDateFormatted(cell)
                    ? cell.getLocalDateTimeCellValue().toLocalDate().toString()
                    : formatNumericCell(cell.getNumericCellValue());
                case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
                default -> "";
            };
        } catch (Exception e) {
            return "";
        }
    }

    /** Simple keyword-based category guesser */
    private String guessCategory(String narr) {
        String n = narr.toUpperCase();
        if (n.contains("SWIGGY") || n.contains("ZOMATO") || n.contains("FOOD"))   return "Food";
        if (n.contains("AMAZON") || n.contains("FLIPKART") || n.contains("MYNTRA"))return "Shopping";
        if (n.contains("SALARY") || n.contains("SAL "))                             return "Salary";
        if (n.contains("PETROL") || n.contains("FUEL"))                             return "Fuel";
        if (n.contains("UBER") || n.contains("OLA") || n.contains("RAPIDO"))       return "Transport";
        if (n.contains("ELECTRICITY") || n.contains("BESCOM") || n.contains("BILL"))return "Utilities";
        if (n.contains("NETFLIX") || n.contains("PRIME") || n.contains("SPOTIFY")) return "Entertainment";
        if (n.contains("ATM"))                                                       return "Cash Withdrawal";
        if (n.contains("EMI") || n.contains("LOAN"))                               return "Loan EMI";
        if (n.contains("INSURANCE") || n.contains("LIC"))                           return "Insurance";
        if (n.contains("MUTUAL") || n.contains("SIP") || n.contains("MF"))         return "Investment";
        if (n.contains("RENT"))                                                      return "Rent";
        if (n.contains("INTEREST"))                                                  return "Interest";
        if (n.contains("REFUND") || n.contains("REVERSAL"))                         return "Refund";
        return "Uncategorized";
    }
    private Workbook openEncryptedWorkbook(java.io.InputStream is, String password) throws Exception {
        org.apache.poi.poifs.filesystem.POIFSFileSystem fs = new org.apache.poi.poifs.filesystem.POIFSFileSystem(is);
        org.apache.poi.poifs.crypt.EncryptionInfo info = new org.apache.poi.poifs.crypt.EncryptionInfo(fs);
        org.apache.poi.poifs.crypt.Decryptor dec = org.apache.poi.poifs.crypt.Decryptor.getInstance(info);
        if (!dec.verifyPassword(password))
            throw new RuntimeException("Incorrect password for the Excel file.");
        return WorkbookFactory.create(dec.getDataStream(fs));
    }

}