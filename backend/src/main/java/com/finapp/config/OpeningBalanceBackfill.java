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

    @Override
    @Transactional
    public void run(String... args) {
        int done = 0;
        for (Asset asset : assetRepository.findAll()) {
            boolean tracked = asset.getCategory() == AssetCategory.BANK
                           || asset.getCategory() == AssetCategory.CREDIT_CARD;
            if (!tracked || asset.getOpeningBalance() != null || asset.getUser() == null) continue;

            balanceService.backfillOpeningBalance(asset.getUser(), asset);
            // Bring the balance and every row's running balance in line with
            // the starting point that was just established.
            balanceService.recomputeAll(asset.getUser(), asset.getName());
            done++;
        }
        if (done > 0) {
            System.out.println("=== OpeningBalanceBackfill: rebuilt " + done + " account(s) from their ledger ===");
        }
    }
}
