package com.finapp.service;

import java.util.Locale;

import com.finapp.dto.TransactionDTO;
import com.finapp.model.ImportFormat;
import com.finapp.model.TransactionType;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.*;
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
 * Parses Credit Card statements (CSV, Excel, PDF) using a custom ImportFormat.
 * Completely separate from BankPdfParser — bank parsing code is untouched.
 *
 * CC statements differ from bank statements:
 *  - Single amount column (not separate debit/credit columns)
 *  - Type determined by suffix (CR/DR), signed value, or keyword
 *  - PDF statements may have reward points, % breakdowns, section headers as noise
 */
@Service
public class CreditCardParser {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CreditCardParser.class);
    private static final String AMT = "([\\d,]+\\.\\d{2})";

    // ─────────────────────────────── PUBLIC API ──────────────────────────────

    public List<TransactionDTO> parseCSV(MultipartFile file, ImportFormat fmt) {
        List<TransactionDTO> list = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
             CSVReader csv = new CSVReaderBuilder(reader).withSkipLines(0).build()) {
            int skip = fmt.getSkipRows() != null ? fmt.getSkipRows() : 1;
            List<String[]> allRows = csv.readAll();
            if (allRows.size() <= skip) return list;

            String[] headerRow = allRows.get(skip - 1);
            Map<String, Integer> colIndex = buildColIndex(headerRow);

            DateTimeFormatter dateFmt = fmt.getDateFormat() != null
                ? DateTimeFormatter.ofPattern(fmt.getDateFormat(), Locale.ENGLISH) : null;
            String mode  = mode(fmt);
            String crInd = crInd(fmt);
            String drInd = drInd(fmt);

            for (int i = skip; i < allRows.size(); i++) {
                try {
                    TransactionDTO dto = mapRow(allRows.get(i), colIndex, fmt, dateFmt, mode, crInd, drInd);
                    if (dto != null && dto.getAmount() != null && dto.getAmount().compareTo(BigDecimal.ZERO) != 0)
                        list.add(dto);
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing CC CSV: " + e.getMessage());
        }
        return list;
    }

    public List<TransactionDTO> parseExcel(MultipartFile file, ImportFormat fmt) {
        return parseExcel(file, fmt, null);
    }

    public List<TransactionDTO> parseExcel(MultipartFile file, ImportFormat fmt, String password) {
        List<TransactionDTO> list = new ArrayList<>();
        try (Workbook wb = (password != null && !password.isBlank())
                 ? openEncryptedWorkbook(file.getInputStream(), password) : WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            Map<String, Integer> colIndex = null;
            int dataStart = -1;
            for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String[] r = rowToStrings(row, 15);
                Map<String, Integer> candidate = buildColIndex(r);
                if (isHeaderRow(candidate, fmt)) { colIndex = candidate; dataStart = i + 1; break; }
            }
            if (colIndex == null) throw new RuntimeException("Could not find header row matching CC format columns");

            DateTimeFormatter dateFmt = fmt.getDateFormat() != null
                ? DateTimeFormatter.ofPattern(fmt.getDateFormat(), Locale.ENGLISH) : null;
            String mode  = mode(fmt);
            String crInd = crInd(fmt);
            String drInd = drInd(fmt);

            for (int i = dataStart; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                try {
                    TransactionDTO dto = mapRow(rowToStrings(row, 15), colIndex, fmt, dateFmt, mode, crInd, drInd);
                    if (dto != null && dto.getAmount() != null && dto.getAmount().compareTo(BigDecimal.ZERO) != 0)
                        list.add(dto);
                } catch (Exception ignored) {}
            }
        } catch (RuntimeException e) { throw e;
        } catch (Exception e) { throw new RuntimeException("Error parsing CC Excel: " + e.getMessage()); }
        return list;
    }

    /** Any money-looking amount, used only to spot lines the scanner passed over. */
    private static final Pattern MONEY = Pattern.compile("[0-9,]+[.][0-9]{2}");

    /**
     * A transaction date, as one token (02/09/2026) or three (14 Aug 26).
     *
     * Deliberately not anchored to the start of the line. ICICI prints the GST
     * category split in a column that bleeds into the same text row, so a real
     * transaction can arrive as "28% 02/09/2026 ... 588.82" — the date is there,
     * just not first. find() returns the earliest match, so a line that does
     * begin with its date still splits in the same place as before.
     *
     * The date may be followed by a pipe or comma rather than a space — HDFC
     * prints "24/07/2026| 23:26 ..." — so those count as separators too.
     */
    private static final Pattern LEADING_DATE = Pattern.compile(
        "([0-9]{1,4}[/.-][0-9]{1,2}[/.-][0-9]{1,4}" +
        "|[0-9]{1,2}[- ][A-Za-z]{3,9}[- ][0-9]{2,4})[ 	|,;]+(.*)$");

    public List<TransactionDTO> parsePdf(MultipartFile file, ImportFormat fmt) {
        return parsePdf(file, fmt, null);
    }

    public List<TransactionDTO> parsePdf(MultipartFile file, ImportFormat fmt, String password) {
        String text = extractText(file, password);
        if (text == null || text.length() < 200) {
            log.warn("[CC_PDF] Extracted text too short ({}). PDF may be image-based/scanned.", text != null ? text.length() : 0);
            return new ArrayList<>();
        }
        log.info("[CC_PDF] Extracted {} chars from PDF", text.length());

        String mode  = mode(fmt);
        String crInd = crInd(fmt);
        String drInd = drInd(fmt);
        DateTimeFormatter dateFmt = fmt.getDateFormat() != null && !fmt.getDateFormat().isBlank()
            ? DateTimeFormatter.ofPattern(fmt.getDateFormat(), Locale.ENGLISH) : null;

        String[] rawLines = text.split("\\r?\\n");

        // Step 1: Find header line to get column positions
        int headerLineIdx = -1;
        int amountColStart = -1;
        for (int i = 0; i < rawLines.length; i++) {
            String l = rawLines[i];
            if (l.toLowerCase().contains("date") && l.toLowerCase().matches(".*\\bamount\\b.*")) {
                headerLineIdx = i;
                int amtIdx = l.toLowerCase().lastIndexOf("amount");
                amountColStart = amtIdx > 0 ? amtIdx : -1;
                log.info("[CC_PDF] Header found at line {}: amountColStart={}", i, amountColStart);
                break;
            }
        }

        // Step 2: Collect transaction entries using column positions
        List<String[]> txRaw = new ArrayList<>(); // [dateStr, desc, amtStr, indicator]
        List<String> unmatched = new ArrayList<>();
        final int DATE_COL_END = 12;

        for (int i = headerLineIdx + 1; i < rawLines.length; i++) {
            String raw = rawLines[i];
            if (raw.isBlank()) continue;

            // Match the date where it actually ends instead of assuming a
            // fixed column. This read a fixed-width prefix and tested only its
            // first whitespace-separated token, so a date written "14 Aug 26"
            // was tested as "14" and never recognised — a statement in that
            // style yielded no transactions at all.
            Matcher dm = LEADING_DATE.matcher(raw);

            if (dm.find()) {
                String dateStr = dm.group(1).trim();
                String rest = dm.group(2).trim();
                String desc = rest, amtStr = "", indicator = "";

                Matcher am = Pattern.compile(
                    // Any short letter code, not only the two this format names:
                    // cards write C/D, CR/DR, and sometimes a third for EMI rows.
                    // Refusing to match an unknown one dropped the whole line.
                    "(?:[0-9]+[ ]+)?([0-9,]+[.][0-9]{2})(?:[ ]+([A-Za-z]{1,3}))?[ ]*$",
                    Pattern.CASE_INSENSITIVE).matcher(rest);
                if (am.find()) {
                    amtStr = am.group(1);
                    indicator = am.group(2) != null ? am.group(2).trim() : "";
                    desc = rest.substring(0, am.start()).trim();
                    desc = desc.replaceAll("\\s+\\d+\\s*$", "").trim(); // strip trailing reward points
                }
                txRaw.add(new String[]{dateStr, desc, amtStr, indicator});

            } else {
                // Recorded only, never acted on: a line carrying a money amount
                // that the scanner did not take is the shape of a transaction it
                // failed to recognise, and naming it turns "rows are missing"
                // into something answerable without needing the file.
                if (MONEY.matcher(raw).find() && unmatched.size() < 25) unmatched.add(raw.trim());

                if (!txRaw.isEmpty() && amountColStart > 0) {
                    // Continuation line — only join if within description column and not junk
                    String trimmed = raw.trim();
                    if (trimmed.contains("%") || trimmed.matches("\\d+") || trimmed.startsWith("#")
                            || trimmed.contains("`") || trimmed.matches("[A-Z]{4,}")) continue;
                    int contentStart = raw.length() - raw.stripLeading().length();
                    if (contentStart < amountColStart) {
                        String[] last = txRaw.get(txRaw.size() - 1);
                        if (last[2].isBlank()) {
                            last[1] = (last[1] + " " + trimmed).trim();
                        }
                    }
                }
            }
        }
        log.info("[CC_PDF] Collected {} transaction entries", txRaw.size());
        // A line holding a money amount that the scanner did not take is the
        // shape of a transaction it failed to recognise. Naming them turns
        // "some rows are missing" into something answerable without the file.
        for (String u : unmatched) log.info("[CC_PDF] Line with an amount but no usable date: {}", u);

        // Step 3: Parse into DTOs
        List<TransactionDTO> list = new ArrayList<>();
        int emiRows = 0;
        for (String[] entry : txRaw) {
            try {
                String dateStr = entry[0], narr = entry[1], amtStr = entry[2], indic = entry[3];
                if (amtStr.isBlank()) { log.debug("[CC_PDF] No amount for: {}", narr); continue; }

                // An EMI instalment booking, which SBI marks M. The card's own
                // account summary leaves these out of both the purchases and the
                // fees it adds up to the closing balance — the spend was already
                // billed when the purchase was converted. Importing it would
                // overstate the card by the instalment amount.
                if ("M".equalsIgnoreCase(indic)) {
                    emiRows++;
                    log.info("[CC_PDF] Skipping EMI instalment row: {} {}", narr, amtStr);
                    continue;
                }

                LocalDate date;
                // Fall back when the configured pattern does not fit. A format
                // saying "dd MMM yyyy" against a statement printing "14 Aug 26"
                // matched nothing, and every row was discarded on the date
                // alone. The configured pattern is still tried first.
                LocalDate parsedDate = null;
                if (dateFmt != null) {
                    try { parsedDate = LocalDate.parse(dateStr, dateFmt); } catch (Exception ignored) {}
                }
                if (parsedDate == null) {
                    try { parsedDate = parseDateMulti(dateStr); }
                    catch (Exception e) { log.debug("[CC_PDF] Bad date '{}': {}", dateStr, e.getMessage()); continue; }
                }
                date = parsedDate;

                BigDecimal amt = parseMoney(amtStr);
                if (amt.compareTo(BigDecimal.ZERO) == 0) continue;

                // A plus sitting just before the amount marks money coming in.
                // HDFC writes its card payment that way and nothing else on the
                // statement carries one, while the narration ("BPPY CC PAYMENT")
                // matches none of the credit keywords, so without this the one
                // payment on the statement would be filed as a purchase.
                TransactionType txType = signalsMoneyIn(narr)
                        ? TransactionType.CREDIT
                        : resolveType(mode, indic, narr, amt, crInd, drInd);
                TransactionDTO dto = new TransactionDTO();
                dto.setDate(date); dto.setTitle(narr); dto.setDescription(narr);
                dto.setAmount(amt.abs()); dto.setType(txType);
                dto.setBudgetCategory(guessCategory(narr));
                list.add(dto);
                log.debug("[CC_PDF] Parsed: {} | {} | {} | {}", date, narr, amt, txType);
            } catch (Exception e) { log.debug("[CC_PDF] Error: {}", e.getMessage()); }
        }
        log.info("[CC_PDF] Total parsed: {} ({} EMI instalment row(s) skipped)", list.size(), emiRows);
        return list;
    }

    // ─────────────────────────────── HELPERS ─────────────────────────────────

    private TransactionDTO mapRow(String[] r, Map<String, Integer> colIndex, ImportFormat fmt,
            DateTimeFormatter dateFmt, String mode, String crInd, String drInd) {
        String dateStr = getCol(r, colIndex, fmt.getDateColumn());
        if (dateStr.isBlank()) return null;
        String desc   = getCol(r, colIndex, fmt.getDescriptionColumn());
        String amtRaw = getCol(r, colIndex, fmt.getAmountColumn());
        if (amtRaw.isBlank()) return null;

        boolean isCredit = false;
        String amtClean = amtRaw;

        if ("SUFFIX".equals(mode)) {
            String upper = amtRaw.toUpperCase().trim();
            if (upper.endsWith(crInd.toUpperCase())) {
                isCredit = true;
                amtClean = amtRaw.substring(0, amtRaw.length() - crInd.length()).trim();
            } else if (upper.endsWith(drInd.toUpperCase())) {
                amtClean = amtRaw.substring(0, amtRaw.length() - drInd.length()).trim();
            }
        } else if ("SIGNED".equals(mode)) {
            isCredit = amtRaw.trim().startsWith("-");
            amtClean = amtRaw.replace("-", "").trim();
        } else {
            isCredit = isCreditNarration(desc);
        }

        BigDecimal val = parseMoneySafe(amtClean);
        if (val == null || val.compareTo(BigDecimal.ZERO) == 0) return null;

        TransactionDTO dto = new TransactionDTO();
        dto.setDate(dateFmt != null ? LocalDate.parse(dateStr, dateFmt) : parseDateMulti(dateStr));
        dto.setTitle(desc); dto.setDescription(desc);
        dto.setAmount(val.abs());
        dto.setType(isCredit ? TransactionType.CREDIT : TransactionType.DEBIT);
        dto.setBudgetCategory(guessCategory(desc));
        return dto;
    }

    private TransactionType resolveType(String mode, String indic, String narr, BigDecimal amt,
                                        String crInd, String drInd) {
        // When the line carries its own marker, believe it. Guessing from the
        // wording is only a fallback, and it read a refund printed "... 5,166.30 C"
        // as a purchase because the narration looked like one. C/CR and D/DR are
        // near universal, so they are honoured alongside whatever the format names.
        if (indic != null && !indic.isBlank()) {
            String i = indic.trim().toUpperCase();
            if (i.equals(crInd.toUpperCase()) || i.equals("C") || i.equals("CR")) return TransactionType.CREDIT;
            if (i.equals(drInd.toUpperCase()) || i.equals("D") || i.equals("DR")) return TransactionType.DEBIT;
            // Anything else (SBI prints M on EMI instalments) falls through.
        }
        return switch (mode) {
            case "SUFFIX", "COLUMN" -> indic.equalsIgnoreCase(crInd) ? TransactionType.CREDIT : TransactionType.DEBIT;
            case "SIGNED" -> amt.compareTo(BigDecimal.ZERO) < 0 ? TransactionType.CREDIT : TransactionType.DEBIT;
            default -> isCreditNarration(narr) ? TransactionType.CREDIT : TransactionType.DEBIT;
        };
    }

    private String extractText(MultipartFile file, String password) {
        try {
            byte[] bytes = file.getInputStream().readAllBytes();
            PDDocument doc = (password != null && !password.isBlank())
                ? Loader.loadPDF(bytes, password) : Loader.loadPDF(bytes);
            try (doc) {
                PDFTextStripper s = new PDFTextStripper();
                s.setSortByPosition(true);
                return s.getText(doc);
            }
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            if (msg.toLowerCase().contains("password") || msg.toLowerCase().contains("encrypt"))
                throw new RuntimeException("PDF is password protected. Please provide the correct password.");
            throw new RuntimeException("Could not read PDF: " + msg);
        }
    }

    private boolean isHeaderRow(Map<String, Integer> c, ImportFormat fmt) {
        int m = 0;
        if (fmt.getDateColumn() != null && c.containsKey(fmt.getDateColumn().trim().toLowerCase())) m++;
        if (fmt.getDescriptionColumn() != null && c.containsKey(fmt.getDescriptionColumn().trim().toLowerCase())) m++;
        if (fmt.getAmountColumn() != null && c.containsKey(fmt.getAmountColumn().trim().toLowerCase())) m++;
        return m >= 2;
    }

    private Map<String, Integer> buildColIndex(String[] headers) {
        Map<String, Integer> map = new java.util.LinkedHashMap<>();
        for (int i = 0; i < headers.length; i++)
            if (headers[i] != null && !headers[i].isBlank())
                map.put(headers[i].trim().toLowerCase(), i);
        return map;
    }

    private String getCol(String[] r, Map<String, Integer> idx, String name) {
        if (name == null) return "";
        Integer i = idx.get(name.trim().toLowerCase());
        if (i == null || i >= r.length) return "";
        return r[i] == null ? "" : r[i].trim();
    }

    private String[] rowToStrings(Row row, int max) {
        String[] arr = new String[max];
        for (int c = 0; c < max; c++) {
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
                : (cell.getNumericCellValue() == Math.floor(cell.getNumericCellValue())
                    ? String.format("%.0f", cell.getNumericCellValue())
                    : String.format("%.2f", cell.getNumericCellValue()));
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }

    private boolean looksLikeDate(String s) {
        if (s == null || s.isEmpty()) return false;
        s = s.trim();
        return s.matches("\\d{1,4}[/,\\-\\.]\\d{1,2}[/,\\-\\.]\\d{1,4}") ||
               s.matches("\\d{1,2}[-\\s][A-Za-z]{3}[-\\s]\\d{2,4}");
    }

    private LocalDate parseDateMulti(String s) {
        s = s.trim().replace(',', '.');
        DateTimeFormatter[] fmts = {
            DateTimeFormatter.ofPattern("dd-MM-yyyy", Locale.ENGLISH), DateTimeFormatter.ofPattern("dd-MM-yy", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("dd-MMM-yyyy", Locale.ENGLISH), DateTimeFormatter.ofPattern("dd-MMM-yy", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH), DateTimeFormatter.ofPattern("dd MMM yy", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.ENGLISH), DateTimeFormatter.ofPattern("dd.MM.yyyy", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("dd.MM.yy", Locale.ENGLISH), DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("dd/MM/yy", Locale.ENGLISH), DateTimeFormatter.ofPattern("d/M/yyyy", Locale.ENGLISH),
        };
        for (DateTimeFormatter f : fmts) { try { return LocalDate.parse(s, f); } catch (Exception ignored) {} }
        throw new RuntimeException("Cannot parse date: " + s);
    }

    private BigDecimal parseMoney(String s) {
        if (s == null || s.isBlank()) return BigDecimal.ZERO;
        return new BigDecimal(s.replaceAll(",", "").trim());
    }

    private BigDecimal parseMoneySafe(String s) {
        try { return (s == null || s.isBlank()) ? null : new BigDecimal(s.replaceAll(",", "").trim()); }
        catch (Exception e) { return null; }
    }

    /**
     * Whether the text running up to the amount ends in a plus.
     *
     * Only the tail is considered: a plus earlier in a merchant name says
     * nothing about direction. Currency marks are skipped over, because the
     * rupee sign often survives text extraction as a stray letter.
     */
    private boolean signalsMoneyIn(String narr) {
        if (narr == null) return false;
        int plus = narr.lastIndexOf('+');
        if (plus < 0) return false;
        // What follows the plus decides whether it marked the amount or merely
        // sat inside a merchant name. A currency mark may trail it — the rupee
        // sign often survives extraction as a stray letter — but nothing more.
        String after = narr.substring(plus + 1).replace(" ", "");
        return after.length() <= 2 && after.chars().noneMatch(Character::isDigit);
    }

    private boolean isCreditNarration(String narr) {
        String n = narr.toUpperCase();
        return n.contains("CREDIT") || n.contains("REFUND") || n.contains("CASHBACK")
            || n.contains("REVERSAL") || n.contains("PAYMENT RECEIVED") || n.contains("BBPS");
    }

    private String mode(ImportFormat fmt) {
        return fmt.getTypeIndicatorMode() != null ? fmt.getTypeIndicatorMode().toUpperCase() : "KEYWORD";
    }
    private String crInd(ImportFormat fmt) {
        return fmt.getCreditIndicator() != null ? fmt.getCreditIndicator().trim() : "CR";
    }
    private String drInd(ImportFormat fmt) {
        return fmt.getDebitIndicator() != null ? fmt.getDebitIndicator().trim() : "DR";
    }

    private String guessCategory(String narr) {
        String n = narr.toUpperCase();
        if (n.contains("SWIGGY") || n.contains("ZOMATO") || n.contains("FOOD"))    return "Food";
        if (n.contains("AMAZON") || n.contains("FLIPKART") || n.contains("MYNTRA")) return "Shopping";
        if (n.contains("PETROL") || n.contains("FUEL"))                              return "Fuel";
        if (n.contains("UBER") || n.contains("OLA") || n.contains("RAPIDO"))        return "Transport";
        if (n.contains("ELECTRICITY") || n.contains("BILL"))                         return "Utilities";
        if (n.contains("NETFLIX") || n.contains("PRIME") || n.contains("SPOTIFY"))  return "Entertainment";
        if (n.contains("EMI") || n.contains("LOAN"))                                 return "Loan EMI";
        if (n.contains("INSURANCE") || n.contains("LIC"))                            return "Insurance";
        if (n.contains("REFUND") || n.contains("REVERSAL"))                          return "Refund";
        if (n.contains("BBPS") || n.contains("PAYMENT"))                             return "Payment";
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
