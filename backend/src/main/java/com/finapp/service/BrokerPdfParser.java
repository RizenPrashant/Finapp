package com.finapp.service;

import com.finapp.dto.TradeDTO;
import com.finapp.model.ImportFormat;
import com.finapp.model.Trade;
import com.finapp.model.Trade.TradeType;
import com.finapp.model.Trade.PositionType;
import com.finapp.model.TradeSegment;
import com.finapp.model.TradeStatus;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses official broker trade-book / P&L PDFs for Zerodha and Upstox.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ZERODHA Trade Book (Console → Reports → Tradebook → Download PDF)
 *   Columns: Symbol | ISIN | Trade Date | Exchange | Segment | Trade Type |
 *            Quantity | Price | Trade Value | Order ID
 *   Date format: dd-MM-yyyy
 *
 * ZERODHA P&L (Console → Reports → P&L → Download PDF)
 *   Columns: Symbol | ISIN | Open Date | Buy Qty | Buy Price | Close Date |
 *            Sell Qty | Sell Price | P&L
 *
 * UPSTOX Trade Book (Upstox → Reports → Download PDF)
 *   Columns: Symbol | Series | Trade Date | Buy/Sell | Qty | Price | Value
 *   Date format: dd/MM/yyyy
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * NOTE: Password-protected or scanned PDFs are not supported.
 */
@Service
public class BrokerPdfParser {

    private static final Logger log = LoggerFactory.getLogger(BrokerPdfParser.class);

    private static final String AMT  = "([\\d,]+\\.\\d+)";
    private static final String QTY  = "(\\d+)";
    private static final String DATE_DMY  = "(\\d{2}-\\d{2}-\\d{4})";
    private static final String DATE_DMY2 = "(\\d{2}/\\d{2}/\\d{4})";

    // ───────────────────────────── PUBLIC API ────────────────────────────────────

    public List<TradeDTO> parse(MultipartFile file, String brokerType) {
        return parse(file, brokerType, null);
    }

    public List<TradeDTO> parse(MultipartFile file, String brokerType, String password) {
        String text = extractText(file);
        return switch (brokerType.toUpperCase()) {
            case "ZERODHA" -> parseZerodha(text);
            case "UPSTOX"  -> parseUpstox(text);
            default        -> parseGeneric(text);
        };
    }

    // ─────────────────────────────── TEXT EXTRACT ────────────────────────────────

    private String extractText(MultipartFile file) {
        return extractText(file, null);
    }

    private String extractText(MultipartFile file, String password) {
        try {
            byte[] bytes = file.getBytes();
            PDDocument doc = (password != null && !password.isBlank())
                ? Loader.loadPDF(bytes, password) : Loader.loadPDF(bytes);
            try (doc) {
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setSortByPosition(true);
                return stripper.getText(doc);
            }
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            if (msg.toLowerCase().contains("password") || msg.toLowerCase().contains("encrypt"))
                throw new RuntimeException("PDF is password protected. Please provide the correct password.");
            throw new RuntimeException("Could not read PDF: " + msg);
        }
    }

    // ───────────────────────────── ZERODHA ───────────────────────────────────────
    // Trade Book row: RELIANCE  INE002A01018  15-01-2024  NSE  EQ  BUY  10  2450.50  24505.00  ...
    // P&L row       : RELIANCE  INE002A01018  10-01-2024  10  2400.00  15-01-2024  10  2450.50  500.00
    private List<TradeDTO> parseZerodha(String text) {
        List<TradeDTO> list = new ArrayList<>();

        // ── Try Trade Book format first ──
        // Symbol  DATE  EXCHANGE  SEGMENT  BUY/SELL  QTY  PRICE  VALUE
        Pattern tradeLine = Pattern.compile(
            "^([A-Z0-9\\-&]+)\\s+" +          // symbol
            "(?:\\S+\\s+)?" +                  // optional ISIN
            DATE_DMY + "\\s+" +                // trade date
            "(?:NSE|BSE|MCX|NFO|CDS)\\s+" +   // exchange
            "(EQ|FO|FNO|CDS|MCX|CURR)\\s+" +  // segment
            "(BUY|SELL)\\s+" +                 // type
            QTY + "\\s+" +                     // qty
            AMT + "\\s+" +                     // price
            AMT +                               // trade value
            "(?:\\s+" + AMT + ")?",             // optional brokerage
            Pattern.CASE_INSENSITIVE
        );

        // ── P&L format ──
        // Symbol  ISIN  OpenDate  BuyQty  BuyPrice  CloseDate  SellQty  SellPrice  PnL
        Pattern pnlLine = Pattern.compile(
            "^([A-Z0-9\\-&]+)\\s+" +
            "(?:\\S+\\s+)?" +
            DATE_DMY + "\\s+" +
            QTY + "\\s+" +
            AMT + "\\s+" +
            DATE_DMY + "\\s+" +
            QTY + "\\s+" +
            AMT + "\\s+" +
            "(-?[\\d,]+\\.\\d+)",
            Pattern.CASE_INSENSITIVE
        );

        for (String l : text.split("\\r?\\n")) {
            String line = l.trim();

            // Trade book row
            Matcher mt = tradeLine.matcher(line);
            if (mt.find()) {
                try {
                    TradeDTO dto = new TradeDTO();
                    dto.setStockName(mt.group(1));
                    dto.setEntryDate(parseDate(mt.group(2), "dd-MM-yyyy"));
                    dto.setSegment(mapSegment(mt.group(3)));
                    boolean isBuy = mt.group(4).equalsIgnoreCase("BUY");
                    dto.setTradeType(Trade.TradeType.SWING);
                    dto.setPositionType(isBuy ? Trade.PositionType.LONG : Trade.PositionType.SHORT);
                    dto.setQuantity(Integer.parseInt(mt.group(5)));
                    dto.setBuyPrice(isBuy  ? new BigDecimal(clean(mt.group(6))) : null);
                    dto.setSellPrice(!isBuy ? new BigDecimal(clean(mt.group(6))) : null);
                    dto.setInvestedAmount(new BigDecimal(clean(mt.group(7))));
                    dto.setBrokerage(mt.group(8) != null && !mt.group(8).isBlank() ? new BigDecimal(clean(mt.group(8))) : BigDecimal.ZERO);
                    dto.setStatus(TradeStatus.OPEN);
                    dto.setBroker("ZERODHA");
                    list.add(dto);
                } catch (Exception ignored) {}
                continue;
            }

            // P&L row
            Matcher mp = pnlLine.matcher(line);
            if (mp.find()) {
                try {
                    TradeDTO dto = new TradeDTO();
                    dto.setStockName(mp.group(1));
                    dto.setEntryDate(parseDate(mp.group(2), "dd-MM-yyyy"));
                    dto.setQuantity(Integer.parseInt(mp.group(3)));
                    dto.setBuyPrice(new BigDecimal(clean(mp.group(4))));
                    dto.setExitDate(parseDate(mp.group(5), "dd-MM-yyyy"));
                    dto.setSellPrice(new BigDecimal(clean(mp.group(7))));
                    BigDecimal pnl = new BigDecimal(clean(mp.group(8)));
                    dto.setProfitLoss(pnl);
                    dto.setProfitLossPercentage(dto.getBuyPrice().compareTo(BigDecimal.ZERO) != 0
                        ? pnl.divide(dto.getBuyPrice().multiply(BigDecimal.valueOf(dto.getQuantity())), 4, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                        : BigDecimal.ZERO);
                    dto.setInvestedAmount(dto.getBuyPrice().multiply(BigDecimal.valueOf(dto.getQuantity())));
                    dto.setReturnAmount(dto.getSellPrice().multiply(BigDecimal.valueOf(dto.getQuantity())));
                    dto.setBrokerage(BigDecimal.ZERO); // P&L doesn't show brokerage separately
                    dto.setSegment(TradeSegment.EQUITY);
                    dto.setTradeType(Trade.TradeType.SWING);
                    dto.setPositionType(Trade.PositionType.LONG);
                    dto.setStatus(TradeStatus.CLOSED);
                    dto.setBroker("ZERODHA");
                    list.add(dto);
                } catch (Exception ignored) {}
            }
        }
        return list;
    }

    // ───────────────────────────── UPSTOX ────────────────────────────────────────
    // Row: RELIANCE  EQ  01/01/2024  B  10  2450.50  24505.00
    private List<TradeDTO> parseUpstox(String text) {
        List<TradeDTO> list = new ArrayList<>();
        Pattern line = Pattern.compile(
            "^([A-Z0-9\\-&]+(?:-[A-Z]+)?)\\s+" +   // symbol
            "(?:[A-Z]+\\s+)?" +                      // optional series (EQ/BE)
            DATE_DMY2 + "\\s+" +                     // date
            "(B|S|BUY|SELL)\\s+" +                   // buy/sell
            QTY + "\\s+" +                           // qty
            AMT + "\\s+" +                           // price
            AMT +                                    // value
            "(?:\\s+" + AMT + ")?",                  // optional brokerage
            Pattern.CASE_INSENSITIVE
        );
        for (String l : text.split("\\r?\\n")) {
            Matcher m = line.matcher(l.trim());
            if (!m.find()) continue;
            try {
                TradeDTO dto = new TradeDTO();
                dto.setStockName(m.group(1));
                dto.setEntryDate(parseDate(m.group(2), "dd/MM/yyyy"));
                boolean isBuy = m.group(3).toUpperCase().startsWith("B");
                dto.setTradeType(Trade.TradeType.SWING);
                dto.setPositionType(isBuy ? Trade.PositionType.LONG : Trade.PositionType.SHORT);
                dto.setQuantity(Integer.parseInt(m.group(4)));
                dto.setBuyPrice(isBuy  ? new BigDecimal(clean(m.group(5))) : null);
                dto.setSellPrice(!isBuy ? new BigDecimal(clean(m.group(5))) : null);
                dto.setInvestedAmount(new BigDecimal(clean(m.group(6))));
                dto.setBrokerage(m.group(7) != null && !m.group(7).isBlank() ? new BigDecimal(clean(m.group(7))) : BigDecimal.ZERO);
                dto.setSegment(TradeSegment.EQUITY);
                dto.setStatus(TradeStatus.OPEN);
                dto.setBroker("UPSTOX");
                list.add(dto);
            } catch (Exception ignored) {}
        }
        return list;
    }

    // ─────────────────────────── GENERIC FALLBACK ────────────────────────────────
    private List<TradeDTO> parseGeneric(String text) {
        List<TradeDTO> list = new ArrayList<>();
        Pattern line = Pattern.compile(
            "^([A-Z0-9\\-&]+)\\s+(\\d{2}[/\\-.]\\d{2}[/\\-.]\\d{2,4})\\s+(BUY|SELL|B|S)\\s+(\\d+)\\s+" + AMT +
            "(?:\\s+" + AMT + ")?",  // optional brokerage
            Pattern.CASE_INSENSITIVE
        );
        for (String l : text.split("\\r?\\n")) {
            Matcher m = line.matcher(l.trim());
            if (!m.find()) continue;
            try {
                TradeDTO dto = new TradeDTO();
                dto.setStockName(m.group(1));
                dto.setEntryDate(parseDateMulti(m.group(2)));
                boolean isBuy = m.group(3).toUpperCase().startsWith("B");
                dto.setTradeType(Trade.TradeType.SWING);
                dto.setPositionType(isBuy ? Trade.PositionType.LONG : Trade.PositionType.SHORT);
                dto.setQuantity(Integer.parseInt(m.group(4)));
                BigDecimal price = new BigDecimal(clean(m.group(5)));
                dto.setBuyPrice(isBuy ? price : null);
                dto.setSellPrice(!isBuy ? price : null);
                dto.setInvestedAmount(price.multiply(BigDecimal.valueOf(dto.getQuantity())));
                dto.setBrokerage(m.group(6) != null && !m.group(6).isBlank() ? new BigDecimal(clean(m.group(6))) : BigDecimal.ZERO);
                dto.setSegment(TradeSegment.EQUITY);
                dto.setStatus(TradeStatus.OPEN);
                list.add(dto);
            } catch (Exception ignored) {}
        }
        return list;
    }

    // ─────────────────────────────── HELPERS ─────────────────────────────────────

    private LocalDate parseDate(String s, String pattern) {
        return LocalDate.parse(s.trim(), DateTimeFormatter.ofPattern(pattern));
    }

    private String clean(String s) {
        return s == null ? "0" : s.replaceAll(",", "").trim();
    }

    private TradeSegment mapSegment(String s) {
        if (s == null) return TradeSegment.EQUITY;
        return switch (s.toUpperCase()) {
            case "FO", "FNO" -> TradeSegment.FNO;
            case "CDS", "CURR" -> TradeSegment.CURRENCY;
            case "MCX" -> TradeSegment.COMMODITY;
            default -> TradeSegment.EQUITY;
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  CSV PARSING (broker-specific column layouts)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * ZERODHA Trade Book CSV (Console → Reports → Tradebook → Download CSV)
     *   symbol, isin, trade_date, exchange, segment, trade_type, quantity, price, trade_value, order_id
     *
     * ZERODHA P&L CSV (Console → Reports → P&L → Download CSV)
     *   symbol, isin, open_date, buy_qty, buy_price, close_date, sell_qty, sell_price, pnl
     *
     * UPSTOX Trade Book CSV (Upstox → Reports → Tradebook → Export)
     *   instrument_name, quantity, buy_sell, trade_date, trade_price, trade_value
     *
     * GENERIC : symbol, date, buy/sell, qty, price
     */
    public List<TradeDTO> parseCSV(MultipartFile file, String brokerType) {
        List<TradeDTO> list = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
             CSVReader csv = new CSVReaderBuilder(reader).withSkipLines(1).build()) {
            String[] row;
            int rowNum = 0;
            while ((row = csv.readNext()) != null) {
                rowNum++;
                if (row.length < 4) continue;
                try {
                    TradeDTO dto = mapBrokerCsvRow(row, brokerType);
                    if (dto != null) list.add(dto);
                } catch (Exception e) {
                    log.warn("CSV row {} parse failed [{}]: {}", rowNum, brokerType, e.getMessage());
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing broker CSV: " + e.getMessage());
        }
        log.info("parseCSV [{}] → {} trades parsed", brokerType, list.size());
        return list;
    }

    /**
     * Parse CSV using custom ImportFormat column mappings (for user-defined formats)
     */
    public List<TradeDTO> parseCSVWithFormat(MultipartFile file, ImportFormat fmt) {
        List<TradeDTO> list = new ArrayList<>();
        int skipRows = fmt.getSkipRows() != null ? fmt.getSkipRows() : 1;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
             CSVReader csv = new CSVReaderBuilder(reader).withSkipLines(skipRows).build()) {

            // Read header row to get column indices
            String[] header = csv.readNext();
            if (header == null) {
                throw new RuntimeException("CSV file is empty");
            }

            // Create column name to index mapping
            Map<String, Integer> colIndex = new HashMap<>();
            for (int i = 0; i < header.length; i++) {
                colIndex.put(header[i].trim().toLowerCase(), i);
            }

            // Get column indices from format configuration
            Integer symbolIdx = getColumnIndex(colIndex, fmt.getSymbolColumn());
            Integer qtyIdx = getColumnIndex(colIndex, fmt.getQuantityColumn());
            Integer priceIdx = getColumnIndex(colIndex, fmt.getPriceColumn());
            Integer tradeTypeIdx = getColumnIndex(colIndex, fmt.getTradeTypeColumn());
            Integer dateIdx = getColumnIndex(colIndex, fmt.getTradeDateColumn());

            if (symbolIdx == null) {
                throw new RuntimeException("Symbol column not found in CSV. Expected: " + fmt.getSymbolColumn());
            }

            String[] row;
            int rowNum = skipRows + 1; // +1 for header
            while ((row = csv.readNext()) != null) {
                rowNum++;
                if (row.length < 2) continue; // Skip empty rows

                try {
                    TradeDTO dto = new TradeDTO();

                    // Stock Symbol
                    dto.setStockName(row[symbolIdx].trim());

                    // Quantity
                    if (qtyIdx != null && qtyIdx < row.length) {
                        dto.setQuantity(parseInt(row[qtyIdx]));
                    } else {
                        dto.setQuantity(0);
                    }

                    // Price
                    BigDecimal price = BigDecimal.ZERO;
                    if (priceIdx != null && priceIdx < row.length) {
                        price = parseMoney(row[priceIdx]);
                    }

                    // Trade Type (Buy/Sell)
                    String tradeType = "BUY";
                    if (tradeTypeIdx != null && tradeTypeIdx < row.length) {
                        String tt = row[tradeTypeIdx].trim().toUpperCase();
                        tradeType = tt.startsWith("B") ? "BUY" : "SELL";
                    }

                    // Set buy/sell prices and position type
                    if ("BUY".equals(tradeType)) {
                        dto.setBuyPrice(price);
                        dto.setPositionType(PositionType.LONG);
                    } else {
                        dto.setSellPrice(price);
                        dto.setPositionType(PositionType.SHORT);
                    }

                    // Default trade type (can be updated later if parsed from data)
                    dto.setTradeType(TradeType.SWING);

                    // Calculate invested amount
                    if (dto.getQuantity() > 0 && price.compareTo(BigDecimal.ZERO) > 0) {
                        dto.setInvestedAmount(price.multiply(BigDecimal.valueOf(dto.getQuantity())));
                    }

                    // Trade Date
                    if (dateIdx != null && dateIdx < row.length) {
                        dto.setEntryDate(parseDateMulti(row[dateIdx].trim()));
                    } else {
                        dto.setEntryDate(LocalDate.now());
                    }

                    // Default values
                    dto.setStatus(TradeStatus.OPEN);
                    dto.setSegment(TradeSegment.EQUITY);
                    dto.setPositionType(Trade.PositionType.LONG);
                    dto.setBroker(fmt.getName());

                    if (dto.getStockName() != null && !dto.getStockName().isEmpty()) {
                        list.add(dto);
                    }
                } catch (Exception e) {
                    log.warn("CSV row {} parse failed: {}", rowNum, e.getMessage());
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing CSV with custom format: " + e.getMessage(), e);
        }
        log.info("parseCSVWithFormat [{}] → {} trades parsed", fmt.getName(), list.size());
        return list;
    }

    private Integer getColumnIndex(Map<String, Integer> colIndex, String columnName) {
        if (columnName == null || columnName.trim().isEmpty()) return null;
        return colIndex.get(columnName.trim().toLowerCase());
    }

    private TradeDTO mapBrokerCsvRow(String[] r, String brokerType) {
        TradeDTO dto = new TradeDTO();
        switch (brokerType == null ? "GENERIC" : brokerType.toUpperCase()) {
            case "ZERODHA" -> {
                if (r.length >= 9 && looksLikePnlRow(r)) {
                    // P&L format: symbol, isin, open_date, buy_qty, buy_price, close_date, sell_qty, sell_price, pnl
                    dto.setStockName(r[0].trim());
                    dto.setEntryDate(parseDateMulti(r[2].trim()));
                    dto.setQuantity(parseInt(r[3]));
                    dto.setBuyPrice(parseMoney(r[4]));
                    dto.setExitDate(parseDateMulti(r[5].trim()));
                    dto.setSellPrice(parseMoney(r[7]));
                    BigDecimal pnl = parseSignedMoney(r[8]);
                    dto.setProfitLoss(pnl);
                    dto.setInvestedAmount(dto.getBuyPrice().multiply(BigDecimal.valueOf(dto.getQuantity())));
                    dto.setReturnAmount(dto.getSellPrice().multiply(BigDecimal.valueOf(dto.getQuantity())));
                    dto.setProfitLossPercentage(dto.getInvestedAmount().compareTo(BigDecimal.ZERO) != 0
                        ? pnl.divide(dto.getInvestedAmount(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                        : BigDecimal.ZERO);
                    dto.setBrokerage(BigDecimal.ZERO);
                    dto.setSegment(TradeSegment.EQUITY);
                    dto.setTradeType(Trade.TradeType.SWING);
                    dto.setPositionType(Trade.PositionType.LONG);
                    dto.setStatus(TradeStatus.CLOSED);
                    dto.setBroker("ZERODHA");
                } else {
                    // Tradebook columns (Console → Reports → Tradebook → Download XLSX/CSV):
                    // [0]Symbol [1]ISIN [2]Trade Date [3]Exchange [4]Segment [5]Series
                    // [6]Trade Type [7]Auction [8]Quantity [9]Price [10]Trade Value [11]Trade ID [12]Order ID
                    dto.setStockName(r[0].trim());
                    dto.setEntryDate(parseDateMulti(r[2].trim()));
                    dto.setSegment(mapSegment(r.length > 4 ? r[4] : "EQ"));
                    boolean isBuy = r.length > 6 && r[6].trim().equalsIgnoreCase("buy");
                    dto.setTradeType(Trade.TradeType.SWING);
                    dto.setPositionType(isBuy ? Trade.PositionType.LONG : Trade.PositionType.SHORT);
                    dto.setQuantity(parseInt(r[8]));
                    BigDecimal price = parseMoney(r[9]);
                    dto.setBuyPrice(isBuy ? price : null);
                    dto.setSellPrice(!isBuy ? price : null);
                    BigDecimal tradeVal = r.length > 10 && !r[10].isBlank() ? parseMoney(r[10]) : price.multiply(BigDecimal.valueOf(dto.getQuantity()));
                    dto.setInvestedAmount(tradeVal);
                    dto.setBrokerage(BigDecimal.ZERO);
                    dto.setStatus(TradeStatus.OPEN);
                    dto.setBroker("ZERODHA");
                }
            }
            case "UPSTOX" -> {
                // instrument_name, quantity, buy_sell, trade_date, trade_price, trade_value
                dto.setStockName(r[0].trim());
                dto.setQuantity(parseInt(r[1]));
                boolean isBuy = r[2].trim().equalsIgnoreCase("BUY") || r[2].trim().equalsIgnoreCase("B");
                dto.setEntryDate(parseDateMulti(r[3].trim()));
                BigDecimal price = parseMoney(r[4]);
                dto.setBuyPrice(isBuy ? price : null);
                dto.setSellPrice(!isBuy ? price : null);
                dto.setInvestedAmount(parseMoney(r[5]));
                dto.setBrokerage(r.length > 6 ? parseMoney(r[6]) : BigDecimal.ZERO);
                dto.setTradeType(Trade.TradeType.SWING);
                dto.setPositionType(isBuy ? Trade.PositionType.LONG : Trade.PositionType.SHORT);
                dto.setSegment(TradeSegment.EQUITY);
                dto.setStatus(TradeStatus.OPEN);
                dto.setBroker("UPSTOX");
            }
            default -> {
                // Generic: symbol, date, buy/sell, qty, price
                dto.setStockName(r[0].trim());
                dto.setEntryDate(parseDateMulti(r[1].trim()));
                boolean isBuy = r[2].trim().toUpperCase().startsWith("B");
                dto.setTradeType(Trade.TradeType.SWING);
                dto.setPositionType(isBuy ? Trade.PositionType.LONG : Trade.PositionType.SHORT);
                dto.setQuantity(parseInt(r[3]));
                BigDecimal price = parseMoney(r[4]);
                dto.setBuyPrice(isBuy ? price : null);
                dto.setSellPrice(!isBuy ? price : null);
                dto.setInvestedAmount(price.multiply(BigDecimal.valueOf(dto.getQuantity())));
                dto.setBrokerage(r.length > 5 ? parseMoney(r[5]) : BigDecimal.ZERO);
                dto.setSegment(TradeSegment.EQUITY);
                dto.setStatus(TradeStatus.OPEN);
            }
        }
        return dto;
    }

    /** Heuristic: if col[5] looks like a date string → P&L row, else trade-book row */
    private boolean looksLikePnlRow(String[] r) {
        return r.length >= 6 && r[5].trim().matches("\\d{2}[-/]\\d{2}[-/]\\d{2,4}");
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  EXCEL PARSING (broker-specific column layouts)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Dynamic Excel parsing using ImportFormat column name mapping.
     * Reads the header row to build a columnName→index map, then uses
     * the format's configured column names to extract data universally.
     */
    public List<TradeDTO> parseExcel(MultipartFile file, ImportFormat fmt) {
        return parseExcel(file, fmt, null);
    }

    public List<TradeDTO> parseExcel(MultipartFile file, ImportFormat fmt, String password) {
        List<TradeDTO> list = new ArrayList<>();
        try (Workbook wb = (password != null && !password.isBlank())
                 ? openEncryptedWorkbook(file.getInputStream(), password) : WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);

            // Find header row (first row whose first non-empty cell matches a known column name from format)
            int headerRow = -1;
            Map<String, Integer> colIndex = new HashMap<>();
            for (int i = 0; i <= Math.min(20, sheet.getLastRowNum()); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                // Build candidate map for this row
                Map<String, Integer> candidate = new HashMap<>();
                for (int c = 0; c < row.getLastCellNum(); c++) {
                    Cell cell = row.getCell(c);
                    if (cell == null) continue;
                    String val = getCellStr(cell).trim();
                    if (!val.isEmpty()) candidate.put(val.toLowerCase(), c);
                }
                // Check if this row contains at least one of our expected column names
                String sym = fmt.getSymbolColumn();
                String dt  = fmt.getTradeDateColumn();
                boolean hasSymbol = sym != null && candidate.containsKey(sym.toLowerCase());
                boolean hasDate   = dt  != null && candidate.containsKey(dt.toLowerCase());
                if (hasSymbol || hasDate) {
                    headerRow = i;
                    colIndex  = candidate;
                    log.info("Excel header found at row {} via format '{}': cols={}", i, fmt.getName(), candidate.keySet());
                    break;
                }
            }

            if (headerRow < 0) {
                log.warn("Excel header row not found for format '{}', sheet has {} rows", fmt.getName(), sheet.getLastRowNum());
                return list;
            }

            // Helper to resolve column index by format field name
            final Map<String, Integer> idx = colIndex;
            java.util.function.Function<String, Integer> col = name -> {
                if (name == null || name.isBlank()) return -1;
                String key = name.toLowerCase().trim();
                Integer result = idx.get(key);
                log.debug("Column lookup: '{}' -> key='{}' -> index={}", name, key, result);
                return result != null ? result : -1;
            };
            java.util.function.BiFunction<String[], Integer, String> get = (r, i2) ->
                (i2 < 0 || i2 >= r.length) ? "" : (r[i2] == null ? "" : r[i2].trim());

            String symColName = fmt.getSymbolColumn();
            String dtColName = fmt.getTradeDateColumn();
            String bsColName = fmt.getTradeTypeColumn();
            String qtyColName = fmt.getQuantityColumn();
            String priceColName = fmt.getPriceColumn();

            log.info("Format columns — symbol:'{}' date:'{}' buySell:'{}' qty:'{}' price:'{}'",
                symColName, dtColName, bsColName, qtyColName, priceColName);
            log.info("Available columns in header: {}", idx.keySet());

            int symCol  = col.apply(symColName);
            int dtCol   = col.apply(dtColName);
            int bsCol   = col.apply(bsColName);
            int qtyCol  = col.apply(qtyColName);
            int priceCol= col.apply(priceColName);

            log.info("Resolved column indices — symbol:{} date:{} buySell:{} qty:{} price:{}", symCol, dtCol, bsCol, qtyCol, priceCol);

            for (int i = headerRow + 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                try {
                    String[] r = rowToStrings(row, Math.max(15, row.getLastCellNum()));
                    String symbol = get.apply(r, symCol);
                    if (symbol.isBlank()) continue; // skip summary/footer rows

                    TradeDTO dto = new TradeDTO();
                    dto.setStockName(symbol);

                    // Date parsing with fallback
                    String dateStr = get.apply(r, dtCol);
                    if (dateStr.isBlank() && dtCol < 0) {
                        log.warn("Date column not found or empty, using current date for row {}", i);
                        dto.setEntryDate(LocalDate.now());
                    } else if (dateStr.isBlank()) {
                        log.warn("Empty date in row {}, using current date", i);
                        dto.setEntryDate(LocalDate.now());
                    } else {
                        try {
                            dto.setEntryDate(parseDateMulti(dateStr));
                        } catch (Exception e) {
                            log.warn("Cannot parse date '{}', using current date: {}", dateStr, e.getMessage());
                            dto.setEntryDate(LocalDate.now());
                        }
                    }

                    String bs = get.apply(r, bsCol).toUpperCase();
                    boolean isBuy = bs.startsWith("B");
                    dto.setTradeType(Trade.TradeType.SWING);
                    dto.setPositionType(isBuy ? Trade.PositionType.LONG : Trade.PositionType.SHORT);

                    dto.setQuantity(parseInt(get.apply(r, qtyCol)));
                    BigDecimal price = parseMoney(get.apply(r, priceCol));
                    dto.setBuyPrice(isBuy  ? price : null);
                    dto.setSellPrice(!isBuy ? price : null);
                    dto.setInvestedAmount(price.multiply(BigDecimal.valueOf(dto.getQuantity())));
                    dto.setBrokerage(BigDecimal.ZERO);
                    dto.setSegment(TradeSegment.EQUITY);
                    dto.setStatus(TradeStatus.OPEN);
                    dto.setBroker(fmt.getName().toUpperCase().split(" ")[0]);
                    list.add(dto);
                } catch (Exception e) {
                    log.warn("Excel row {} parse failed [{}]: {}", i, fmt.getName(), e.getMessage());
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing broker Excel: " + e.getMessage());
        }
        log.info("parseExcel [{}] → {} trades parsed", fmt.getName(), list.size());
        return list;
    }

    public List<TradeDTO> parseExcel(MultipartFile file, String brokerType) {
        return parseExcel(file, brokerType, null);
    }

    public List<TradeDTO> parseExcel(MultipartFile file, String brokerType, String password) {
        List<TradeDTO> list = new ArrayList<>();
        try (Workbook wb = (password != null && !password.isBlank())
                 ? openEncryptedWorkbook(file.getInputStream(), password) : WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            int dataStartRow = 1;
            for (int i = 0; i <= Math.min(20, sheet.getLastRowNum()); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                Cell c0 = row.getCell(0);
                String first = c0 == null ? "" : getCellStr(c0).toLowerCase().trim();
                log.info("Header scan row {}: first cell = '{}'", i, first);
                if (first.equals("symbol") || first.equals("instrument_name") || first.equals("stock")) {
                    dataStartRow = i + 1;
                    log.info("Excel header found at row {}, data starts at row {}", i, dataStartRow);
                    break;
                }
            }
            log.info("parseExcel [{}] dataStartRow={} lastRow={}", brokerType, dataStartRow, sheet.getLastRowNum());
            for (int i = dataStartRow; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                try {
                    String[] r = rowToStrings(row, 15);
                    log.info("Data row {}: r[0]='{}' r[1]='{}' r[2]='{}' r[6]='{}' r[8]='{}'", i, r[0], r[1], r[2], r.length>6?r[6]:"?", r.length>8?r[8]:"?");
                    if (r[0] == null || r[0].isBlank()) continue;
                    TradeDTO dto = mapBrokerCsvRow(r, brokerType);
                    if (dto != null) list.add(dto);
                } catch (Exception e) {
                    log.warn("Excel row {} parse failed [{}]: {}", i, brokerType, e.getMessage());
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing broker Excel: " + e.getMessage());
        }
        log.info("parseExcel [{}] → {} trades parsed", brokerType, list.size());
        return list;
    }

    private String[] rowToStrings(Row row, int maxCols) {
        int cols = Math.max(maxCols, row.getLastCellNum());
        String[] arr = new String[cols];
        for (int c = 0; c < cols; c++) {
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
                : String.valueOf(cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default      -> "";
        };
    }

    // ─────────────────────────── extra helpers ───────────────────────────────

    private int parseInt(String s) {
        if (s == null || s.isBlank()) return 0;
        return (int) Double.parseDouble(s.replaceAll(",", "").trim());
    }

    private BigDecimal parseMoney(String s) {
        if (s == null || s.isBlank()) return BigDecimal.ZERO;
        return new BigDecimal(s.replaceAll(",", "").trim());
    }

    private BigDecimal parseSignedMoney(String s) {
        if (s == null || s.isBlank()) return BigDecimal.ZERO;
        return new BigDecimal(s.replaceAll(",", "").trim());
    }

    private LocalDate parseDateMulti(String s) {
        s = s.trim().replace("/", "-").replace(".", "-");
        DateTimeFormatter[] fmts = {
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd-MMM-yyyy"),
        };
        for (DateTimeFormatter f : fmts) {
            try { return LocalDate.parse(s, f); } catch (Exception ignored) {}
        }
        throw new RuntimeException("Cannot parse date: " + s);
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