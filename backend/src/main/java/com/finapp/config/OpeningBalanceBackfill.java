package com.finapp.config;

import com.finapp.model.Asset;
import com.finapp.model.AssetCategory;
import com.finapp.repository.AssetRepository;
import com.finapp.service.BalanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gives pre-existing accounts an opening balance.
 *
 * Balances used to be kept by adjusting assets.asset_value on every write,
 * with no record of where the account started. The ledger needs that starting
 * point, so derive it once — see BalanceService.deriveOpeningBalance for how,
 * and why imported statement balances are preferred over the stored value.
 *
 * Guarded on IS NULL, so it runs once and is a no-op on every later boot.
 */
@Component
@RequiredArgsConstructor
@Order(1) // before any seeding
public class OpeningBalanceBackfill implements CommandLineRunner {

    private final AssetRepository assetRepository;
    private final BalanceService balanceService;
    private final jakarta.persistence.EntityManager entityManager;

    @Override
    @Transactional
    public void run(String... args) {
        int done = 0;
        for (Asset asset : assetRepository.findAll()) {
            boolean tracked = asset.getCategory() == AssetCategory.BANK
                           || asset.getCategory() == AssetCategory.CREDIT_CARD;
            if (!tracked || asset.getUser() == null) continue;

            boolean needsOpening = asset.getOpeningBalance() == null;
            // Rows entered before the ledger existed have no running balance of
            // their own. The account view shows one per row, so fill them in
            // rather than leaving most of the column blank.
            boolean missingRunningBalances = !needsOpening && hasRowsWithoutBalance(asset);
            if (!needsOpening && !missingRunningBalances) continue;

            if (needsOpening) balanceService.backfillOpeningBalance(asset.getUser(), asset);
            balanceService.recomputeAll(asset.getUser(), asset.getName());
            done++;
        }
        if (done > 0) {
            System.out.println("=== OpeningBalanceBackfill: rebuilt " + done + " account(s) from their ledger ===");
        }
    }

    private boolean hasRowsWithoutBalance(Asset asset) {
        Object n = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM transactions t " +
                "WHERE t.user_id = :uid AND t.payment_source = :src AND t.balance_after IS NULL")
            .setParameter("uid", asset.getUser().getId())
            .setParameter("src", asset.getName())
            .getSingleResult();
        return Long.parseLong(n.toString()) > 0;
    }
}
