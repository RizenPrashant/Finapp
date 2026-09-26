package com.finapp.dto;

import com.finapp.model.Transaction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * One page of transactions plus the totals for the *whole* filtered set.
 *
 * The totals matter: the Transactions page shows Income / Expense / Net for the
 * current filter, and summing only the loaded page would understate them as
 * soon as the result spans more than one page.
 */
@Data
@Builder
@AllArgsConstructor
public class TransactionPageDTO {

    private List<Transaction> content;

    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean hasNext;

    private BigDecimal totalIncome;
    private BigDecimal totalExpense;
}
