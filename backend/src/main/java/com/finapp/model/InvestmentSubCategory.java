package com.finapp.model;

/**
 * Sub-categories for Investments.
 * Used when AssetCategory = INVESTMENTS
 *
 * Investments
 * ├── Stocks
 * ├── Mutual Funds
 * ├── Crypto
 * ├── Trading
 * └── Rental Property
 */
public enum InvestmentSubCategory {
    STOCKS,
    MUTUAL_FUNDS,
    CRYPTO,
    TRADING,
    RENTAL_PROPERTY,

    // Default/Other
    OTHER
}
