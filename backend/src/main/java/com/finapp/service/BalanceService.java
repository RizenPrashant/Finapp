package com.finapp.service;

import com.finapp.model.Asset;
import com.finapp.model.AssetCategory;
import com.finapp.model.User;
import com.finapp.repository.AssetRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Keeps an account's running balance in step with its transactions.
 *
 * Two numbers are maintained together so they can never disagree:
 *   - transactions.balance_after — the balance immediately after each row
 *   - assets.asset_value          — the balance after the most recent row
 *
 * Both derive from assets.opening_balance plus the ordered effect of every
 * transaction on that payment source, so either can be rebuilt from scratch.
 *
 * A running balance depends on order, so editing or back-dating a row
 * invalidates everything after it. Rather than rewrite the whole account each
 * time, the recompute starts at the affected date and is seeded with the
 * balance immediately before it. Measured on a ten-year account (~7,300 rows):
 * a recent edit is ~8ms, a year back ~35ms, and rewriting the entire account
 * ~800ms.
 */
@Service
@RequiredArgsConstructor
public class BalanceService {

    private final EntityManager entityManager;
    private final AssetRepository assetRepository;

    /** Whether a credit adds to this kind of account's balance. */
    private static boolean creditIncreases(AssetCategory category) {
        // A bank balance rises on money in. A card's balance is what you owe,
        // so it rises on money out and a payment brings it down.
        return category != AssetCategory.CREDIT_CARD;
    }

    private static boolean tracksBalance(Asset asset) {
        return asset != null
            && (asset.getCategory() == AssetCategory.BANK || asset.getCategory() == AssetCategory.CREDIT_CARD);
    }

    /**
     * Rebuild balance_after for every transaction on this account from
     * {@code fromDate} onward, then bring the asset's own balance in line.
     * Pass null to rebuild the whole account.
     */
    @Transactional
    public void recompute(User user, String paymentSource, LocalDate fromDate) {
        if (paymentSource == null || paymentSource.isBlank()) return;
        Asset asset = assetRepository.findByUserAndName(user, paymentSource).orElse(null);
        if (!tracksBalance(asset)) return;

        // An account can reach here without an opening balance — the importer
        // creates assets on the fly and does not set one. Falling back to zero
        // would silently treat the account as having started empty and rewrite
        // every balance on it, so derive the real starting point instead.
        if (asset.getOpeningBalance() == null) {
            asset.setOpeningBalance(deriveOpeningBalance(user, asset));
            assetRepository.save(asset);
        }
        BigDecimal opening = asset.getOpeningBalance();
        String sign = creditIncreases(asset.getCategory())
                ? "CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE -t.amount END"
                : "CASE WHEN t.type = 'DEBIT'  THEN t.amount ELSE -t.amount END";

        // Everything before the window already has a correct balance_after, so
        // the window continues from it instead of restarting at zero. Without
        // this seed every row from fromDate on is silently wrong.
        BigDecimal seed = opening;
        if (fromDate != null) {
            Object prior = entityManager.createNativeQuery(
                    "SELECT t.balance_after FROM transactions t " +
                    "WHERE t.user_id = :uid AND t.payment_source = :src AND t.date < :from " +
                    "ORDER BY t.date DESC, t.id DESC LIMIT 1")
                .setParameter("uid", user.getId())
                .setParameter("src", paymentSource)
                .setParameter("from", fromDate)
                .getResultStream().findFirst().orElse(null);
            // No earlier row, or one that predates this column being populated:
            // fall back to the opening balance.
            seed = prior != null ? new BigDecimal(prior.toString()) : opening;
        }

        StringBuilder sql = new StringBuilder(
            "UPDATE transactions tgt JOIN (" +
            "  SELECT t.id, SUM(" + sign + ") OVER (ORDER BY t.date, t.id ROWS UNBOUNDED PRECEDING) AS running" +
            "  FROM transactions t" +
            "  WHERE t.user_id = :uid AND t.payment_source = :src");
        if (fromDate != null) sql.append(" AND t.date >= :from");
        sql.append(") x ON x.id = tgt.id SET tgt.balance_after = :seed + x.running");

        var update = entityManager.createNativeQuery(sql.toString())
                .setParameter("uid", user.getId())
                .setParameter("src", paymentSource)
                .setParameter("seed", seed);
        if (fromDate != null) update.setParameter("from", fromDate);
        update.executeUpdate();

        syncAssetValue(user, asset, opening);
    }

    /**
     * Settle an account's starting point after an import, then rebuild it.
     *
     * The balance entered when the account was added is the balance as of that
     * moment — it already contains everything the statement is about to
     * describe. Adding the statement's transactions on top of it would count
     * that history twice. So once rows carrying the bank's own running balance
     * arrive, re-derive the opening from them: the statement knows where the
     * account stood before its first line, and the entered figure was only ever
     * a stand-in until something better showed up.
     *
     * When the rows carry no balances there is nothing better, and
     * deriveOpeningBalance works backwards from the stored value instead,
     * which leaves the figure the user entered exactly where it is.
     */
    @Transactional
    public void reanchorFromStatement(User user, String paymentSource) {
        if (paymentSource == null || paymentSource.isBlank()) return;
        Asset asset = assetRepository.findByUserAndName(user, paymentSource).orElse(null);
        if (!tracksBalance(asset)) return;
        asset.setOpeningBalance(deriveOpeningBalance(user, asset));
        assetRepository.save(asset);
        recompute(user, paymentSource, null);
    }

    /** Rebuild the whole account from its opening balance. The repair path. */
    @Transactional
    public void recomputeAll(User user, String paymentSource) {
        recompute(user, paymentSource, null);
    }

    /**
     * The account balance is the last row's running balance, so the header
     * figure and the row figures are the same number rather than two
     * independently maintained ones that can drift apart.
     */
    private void syncAssetValue(User user, Asset asset, BigDecimal opening) {
        Object last = entityManager.createNativeQuery(
                "SELECT t.balance_after FROM transactions t " +
                "WHERE t.user_id = :uid AND t.payment_source = :src " +
                "ORDER BY t.date DESC, t.id DESC LIMIT 1")
            .setParameter("uid", user.getId())
            .setParameter("src", asset.getName())
            .getResultStream().findFirst().orElse(null);

        asset.setValue(last != null ? new BigDecimal(last.toString()) : opening);
        assetRepository.save(asset);
    }

    /**
     * Work out where an account started.
     *
     * Imported rows carry the balance the bank itself printed after each
     * transaction, which is the most trustworthy figure available — so when
     * any exist, anchor on the earliest one and subtract its own effect.
     *
     * Falling back to asset_value instead would anchor on a number that may
     * already have drifted: it was maintained by adjusting it on every write,
     * with nothing to check it against. On real data two accounts had drifted
     * from their statements by 7,550 and 0.61, and deriving the opening
     * balance from them would have preserved the error rather than fixing it.
     *
     * With no imported balances there is nothing better to go on, so the
     * stored value is used and the displayed number stays put.
     */
    public BigDecimal deriveOpeningBalance(User user, Asset asset) {
        Object[] first = (Object[]) entityManager.createNativeQuery(
                "SELECT t.balance_after, t.type, t.amount FROM transactions t " +
                "WHERE t.user_id = :uid AND t.payment_source = :src AND t.balance_after IS NOT NULL " +
                "ORDER BY t.date, t.id LIMIT 1")
            .setParameter("uid", user.getId())
            .setParameter("src", asset.getName())
            .getResultStream().findFirst().orElse(null);

        if (first != null) {
            BigDecimal balanceAfterFirst = new BigDecimal(first[0].toString());
            BigDecimal amount = new BigDecimal(first[2].toString());
            boolean isCredit = "CREDIT".equals(first[1].toString());
            boolean increases = creditIncreases(asset.getCategory()) == isCredit;
            return balanceAfterFirst.subtract(increases ? amount : amount.negate());
        }

        String sign = creditIncreases(asset.getCategory())
                ? "CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE -t.amount END"
                : "CASE WHEN t.type = 'DEBIT'  THEN t.amount ELSE -t.amount END";

        Object net = entityManager.createNativeQuery(
                "SELECT COALESCE(SUM(" + sign + "), 0) FROM transactions t " +
                "WHERE t.user_id = :uid AND t.payment_source = :src")
            .setParameter("uid", user.getId())
            .setParameter("src", asset.getName())
            .getSingleResult();

        BigDecimal current = asset.getValue() != null ? asset.getValue() : BigDecimal.ZERO;
        return current.subtract(new BigDecimal(net.toString()));
    }

    /** Give an account that predates the column an opening balance. */
    @Transactional
    public void backfillOpeningBalance(User user, Asset asset) {
        if (!tracksBalance(asset) || asset.getOpeningBalance() != null) return;
        asset.setOpeningBalance(deriveOpeningBalance(user, asset));
        assetRepository.save(asset);
    }
}
