package com.finapp.config;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gives pre-existing accounts an opening balance.
 *
 * Balances used to be kept by nudging assets.asset_value on every write, with
 * no record of where the account started. The ledger needs that starting
 * point, so derive it once by working backwards from the balance on record:
 *
 *     opening = current value − (effect of every transaction on the account)
 *
 * Doing it this way means the number the user sees today does not move.
 * Guarded on IS NULL, so it runs once and is a no-op on every later boot.
 */
@Component
@RequiredArgsConstructor
@Order(1) // before any seeding
public class OpeningBalanceBackfill implements CommandLineRunner {

    private final EntityManager entityManager;

    @Override
    @Transactional
    public void run(String... args) {
        int updated = entityManager.createNativeQuery(
            "UPDATE assets a SET a.opening_balance = a.asset_value - COALESCE(( " +
            "  SELECT SUM(CASE " +
            "    WHEN a.category = 'CREDIT_CARD' AND t.type = 'DEBIT'  THEN  t.amount " +
            "    WHEN a.category = 'CREDIT_CARD'                       THEN -t.amount " +
            "    WHEN t.type = 'CREDIT'                                THEN  t.amount " +
            "    ELSE -t.amount END) " +
            "  FROM transactions t " +
            "  WHERE t.user_id = a.user_id AND t.payment_source = a.name " +
            "), 0) " +
            "WHERE a.opening_balance IS NULL AND a.category IN ('BANK', 'CREDIT_CARD')")
            .executeUpdate();

        if (updated > 0) {
            System.out.println("=== OpeningBalanceBackfill: derived opening balance for " + updated + " account(s) ===");
        }
    }
}
