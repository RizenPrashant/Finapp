package com.finapp.service;

import com.finapp.dto.TradeDTO;
import com.finapp.model.Trade;
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
import java.util.List;
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

    private static final String AMT  = "([\\d,]+\\.\\d+)";
    private static final String QTY  = "(\\d+)";
    private static final String DATE_DMY  = "(\\d{2}-\\d{2}-\\d{4})";
    private static final String DATE_DMY2 = "(\\d{2}/\\d{2}/\\d{4})";

    // ───────────────────────────── PUBLIC API ────────────────────────────────────

    public List<TradeDTO> parse(MultipartFile file, String brokerType) {
        String text = extractText(file);
        return switch (brokerType.toUpperCase()) {
            case "ZERODHA" -> parseZerodha(text);
            case "UPSTOX"  -> parseUpstox(text);
            default        -> parseGeneric(text);
        };
    }

    // ─────────────────────────────── TEXT EXTRACT ────────────────────────────────

    private String extractText(MultipartFile file) {
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(doc);
        } catch (Exception e) {
            throw new RuntimeException("Could not read PDF. Make sure it is a text-based (not scanned) PDF. Error: " + e.getMessage());
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
            // Detect if Zerodha P&L by peeking header
            String[] row;
            while ((row = csv.readNext()) != null) {
                if (row.length < 4) continue;
                try {
                    TradeDTO dto = mapBrokerCsvRow(row, brokerType);
                    if (dto != null) list.add(dto);
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing broker CSV: " + e.getMessage());
        }
        return list;
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
                    dto.setBrokerage(BigDecimal.ZERO); // P&L CSV doesn't show brokerage
                    dto.setSegment(TradeSegment.EQUITY);
                    dto.setTradeType(Trade.TradeType.SWING);
                    dto.setPositionType(Trade.PositionType.LONG);
                    dto.setStatus(TradeStatus.CLOSED);
                    dto.setBroker("ZERODHA");
                } else {
                    // Trade Book: symbol, isin, trade_date, exchange, segment, trade_type, qty, price, trade_value
                    dto.setStockName(r[0].trim());
                    dto.setEntryDate(parseDateMulti(r[2].trim()));
                    dto.setSegment(mapSegment(r.length > 4 ? r[4] : "EQ"));
                    boolean isBuy = r.length > 5 && r[5].trim().equalsIgnoreCase("BUY");
                    dto.setTradeType(Trade.TradeType.SWING);
                    dto.setPositionType(isBuy ? Trade.PositionType.LONG : Trade.PositionType.SHORT);
                    dto.setQuantity(parseInt(r[6]));
                    BigDecimal price = parseMoney(r[7]);
                    dto.setBuyPrice(isBuy ? price : null);
                    dto.setSellPrice(!isBuy ? price : null);
                    dto.setInvestedAmount(parseMoney(r[8]));
                    dto.setBrokerage(r.length > 9 ? parseMoney(r[9]) : BigDecimal.ZERO);
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

    public List<TradeDTO> parseExcel(MultipartFile file, String brokerType) {
        List<TradeDTO> list = new ArrayList<>();
        try (InputStream is = file.getInputStream();
             Workbook wb = WorkbookFactory.create(is)) {
            Sheet sheet = wb.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                try {
                    String[] r = rowToStrings(row, 10);
                    TradeDTO dto = mapBrokerCsvRow(r, brokerType);
                    if (dto != null) list.add(dto);
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing broker Excel: " + e.getMessage());
        }
        return list;
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
}
