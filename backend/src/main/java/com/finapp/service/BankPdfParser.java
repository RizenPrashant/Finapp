package com.finapp.service;

import com.finapp.dto.TransactionDTO;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses official bank statement PDFs for SBI, ICICI, HDFC.
 *
 * Each bank has a unique table layout. We extract raw text from the PDF
 * and apply bank-specific regex patterns to find transaction rows.
 *
 * Typical statement formats:
 * ─────────────────────────────────────────────────────────────────────
 * SBI  : Date | Description | Ref No | Debit | Credit | Balance
 *        Date format: dd MMM yyyy  (e.g. 01 Jan 2024)
 *
 * ICICI: Date | Description | Debit | Credit | Balance
 *        Date format: dd/MM/yyyy   (e.g. 01/01/2024)
 *
 * HDFC : Date | Narration | Value Dt | Debit | Credit | Balance
 *        Date format: dd/MM/yy     (e.g. 01/01/24)
 * ─────────────────────────────────────────────────────────────────────
 *
 * NOTE: These parsers handle the standard digital (text-based) PDFs.
 * Password-protected or scanned/image PDFs are NOT supported.
 */
@Service
public class BankPdfParser {

    // ── Amount pattern: optional commas, mandatory decimal (e.g. 1,23,456.78) ──
    private static final String AMT = "([\\d,]+\\.\\d{2})";

    // ────────────────────────────── PUBLIC API ──────────────────────────────────

    public List<TransactionDTO> parse(MultipartFile file, String bankType) {
        String text = extractText(file);
        return switch (bankType.toUpperCase()) {
            case "SBI"   -> parseSbi(text);
            case "ICICI" -> parseIcici(text);
            case "HDFC"  -> parseHdfc(text);
            default      -> parseGeneric(text);
        };
    }

    // ─────────────────────────────── TEXT EXTRACT ───────────────────────────────

    private String extractText(MultipartFile file) {
        try (PDDocument doc = Loader.loadPDF(file.getInputStream().readAllBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(doc);
        } catch (Exception e) {
            throw new RuntimeException("Could not read PDF. Make sure it is a text-based (not scanned) PDF. Error: " + e.getMessage());
        }
    }

    // ──────────────────────────────── SBI ───────────────────────────────────────
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
                // balance is last; if two amounts before balance → debit then credit
                // if one amount before balance → determine by context keywords
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

    // ──────────────────────────────── ICICI ──────────────────────────────────────
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

    // ──────────────────────────────── HDFC ───────────────────────────────────────
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

    // ─────────────────────────── GENERIC FALLBACK ────────────────────────────────
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

    // ─────────────────────────────── HELPERS ─────────────────────────────────────

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

    // ══════════════════════════════════════════════════════════════════════════
    //  CSV  PARSING  (bank-specific column layouts)
    // ══════════════════════════════════════════════════════════════════════════

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

    // ══════════════════════════════════════════════════════════════════════════
    //  EXCEL PARSING (bank-specific column layouts)
    // ══════════════════════════════════════════════════════════════════════════

    public List<TransactionDTO> parseExcel(MultipartFile file, String bankType) {
        List<TransactionDTO> list = new ArrayList<>();
        try (InputStream is = file.getInputStream();
             Workbook wb = WorkbookFactory.create(is)) {
            Sheet sheet = wb.getSheetAt(0);
            boolean dataStarted = false;
            for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String[] r = rowToStrings(row, 10);
                // Skip header/metadata rows until we find actual data
                if (!dataStarted) {
                    if (isDataRow(r, bankType)) {
                        dataStarted = true;
                    } else {
                        continue;
                    }
                }
                try {
                    TransactionDTO dto = mapBankCsvRow(r, bankType);
                    if (dto != null && dto.getDate() != null && dto.getAmount() != null
                        && dto.getAmount().compareTo(BigDecimal.ZERO) != 0) {
                        list.add(dto);
                    }
                } catch (Exception e) {
                    // Skip rows that fail to parse
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing bank Excel: " + e.getMessage());
        }
        return list;
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
}
