package com.finapp.model;

/**
 * Asset categories for all financial items.
 * Covers Assets, Liabilities, and Debt types.
 */
public enum AssetCategory {
    // Asset Categories
    CASH,
    BANK,
    GOLD,
    PROPERTY,
    VEHICLES,
    INVESTMENTS,

    // Liability Categories
    CREDIT_CARD,
    PERSONAL_LOAN,

    // Debt Categories
    HOME_LOAN,
    CAR_LOAN,
    EDUCATION_LOAN,

    // Default/Other
    OTHER
}
