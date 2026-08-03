# FinApp - Complete Project Context

## Project Location
- Root: `E:\Finapp`
- Backend: `E:\Finapp\backend`
- Frontend: `E:\Finapp\frontend`

---

## Tech Stack
- **Frontend:** React 18 + Vite 4 + Tailwind CSS 3 + Lucide React + Axios
- **Backend:** Spring Boot 3.4.5 + Java 21 + Spring Data JPA + Lombok
- **Database:** MySQL 8.0.35 (persistent)
- **Build Tool:** Maven 3.9.10
- **Email:** Spring Boot Starter Mail (Gmail SMTP)

---

## How to Run

### Backend (Dev)
```
cd E:\Finapp\backend
mvn spring-boot:run
```
Runs on: `http://localhost:2002` (uses `application-dev.properties`)

### Backend (Prod)
```
mvn spring-boot:run -Dspring.profiles.active=prod
```
Runs on: `http://localhost:2003` (uses `application-prod.properties`)

### Frontend
```
cd E:\Finapp\frontend
npm run dev
```
Runs on: `http://localhost:5173`

---

## Database Config
- **Dev DB:** `finappdb` — port 2002
- **Prod DB:** `finappdb_prod` — port 2003
- **Username:** root / **Password:** root
- **URL:** `jdbc:mysql://localhost:3306/finappdb`
- **ddl-auto:** update (data persists on restart)

---

## Environment / Profiles
- `application.properties` — base config (driver, JPA dialect, JWT, logging, `spring.profiles.active=dev`)
- `application-dev.properties` — port 2002, finappdb, Gmail SMTP credentials (**not committed — in .gitignore**)
- `application-prod.properties` — port 2003, finappdb_prod, Gmail SMTP credentials (**not committed — in .gitignore**)
- `frontend/.env.development` — `VITE_API_BASE_URL=http://localhost:2002/api`
- `frontend/.env.production` — `VITE_API_BASE_URL=http://localhost:2003/api`
- `api.js` uses `import.meta.env.VITE_API_BASE_URL`

### Gmail SMTP Config (in application-dev/prod.properties)
```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=YOUR_GMAIL@gmail.com
spring.mail.password=YOUR_APP_PASSWORD
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

---

## Git Branches
- **`development`** — main working branch (all features)
- **`production`** — stable branch
- Remote: `https://github.com/RizenPrashant/Finapp.git`

### Branch State
| Feature | development | production |
|---------|-------------|------------|
| Core finance (transactions, budgets, assets) | ✅ | ✅ |
| JWT Auth (login/register) | ✅ | ✅ |
| Cashback system | ✅ | ✅ |
| Udhar system | ✅ | ✅ |
| Tax calculator | ✅ | ✅ |
| Change Password | ✅ | ✅ |
| Forgot Password (OTP via Gmail) | ✅ | ✅ |
| Trading / Stock Holdings / Broker PDF Parser | ✅ | ❌ (pending merge) |

---

## Backend Structure
```
E:\Finapp\backend\src\main\java\com\finapp\
├── FinappApplication.java
├── config\
│   ├── CorsConfig.java
│   ├── SecurityConfig.java          # /api/auth/** is public, all else requires JWT
│   ├── JwtConfig.java
│   ├── JwtAuthenticationFilter.java
│   └── DataSeeder.java              # Seeds initial data only if tables are empty
├── controller\
│   ├── AuthController.java          # /api/auth/** - register, login, forgot-password, reset-password, change-password
│   ├── DashboardController.java
│   ├── TransactionController.java
│   ├── BudgetLimitController.java
│   ├── AssetController.java
│   ├── CashbackController.java
│   ├── TradeController.java
│   ├── CompoundingController.java
│   ├── InvestmentController.java
│   ├── ImportController.java
│   ├── ImportFormatController.java
│   ├── TaxController.java
│   ├── UdharController.java
│   └── UserProfileController.java
├── service\
│   ├── UserService.java             # getCurrentUser, changePassword, forgotPassword, resetPassword
│   ├── EmailService.java            # sendPasswordResetOtp via Gmail SMTP (JavaMailSender)
│   ├── JwtService.java
│   ├── CustomUserDetailsService.java
│   ├── DashboardService.java
│   ├── TransactionService.java
│   ├── BudgetLimitService.java
│   ├── AssetService.java
│   ├── CashbackService.java
│   ├── TradingService.java
│   ├── CompoundingService.java
│   ├── InvestmentService.java
│   ├── InvestmentInterestService.java
│   ├── ImportService.java
│   ├── ImportFormatService.java
│   ├── TaxCalculationService.java
│   ├── UdharService.java
│   ├── UserProfileService.java
│   ├── BankPdfParser.java
│   └── BrokerPdfParser.java
├── repository\
│   ├── UserRepository.java
│   ├── PasswordResetTokenRepository.java  # findByToken, deleteAllByEmail
│   ├── TransactionRepository.java
│   ├── BudgetLimitRepository.java
│   ├── AssetRepository.java
│   ├── CashbackWalletRepository.java
│   ├── CashbackEntryRepository.java
│   ├── TradeRepository.java
│   ├── CompoundingHistoryRepository.java
│   ├── CompoundingSettingsRepository.java
│   ├── InvestmentRepository.java
│   ├── ImportFormatRepository.java
│   ├── TaxProfileRepository.java
│   ├── UdharRecordRepository.java
│   └── UdharTransactionLinkRepository.java
├── model\
│   ├── User.java                    # Role: USER/ADMIN
│   ├── PasswordResetToken.java      # fields: id, token, email, expiresAt, used. Has isExpired()
│   ├── Transaction.java
│   ├── TransactionType.java         # enum: CREDIT, DEBIT
│   ├── Asset.java                   # field: asset_value
│   ├── AssetType.java               # enum: ASSET, LIABILITY, DEBT, INVESTMENT
│   ├── BudgetLimit.java
│   ├── CashbackWallet.java
│   ├── CashbackEntry.java
│   ├── Trade.java
│   ├── CompoundingHistory.java
│   ├── CompoundingSettings.java
│   ├── Investment.java
│   ├── ImportFormat.java
│   ├── TaxProfile.java
│   ├── UdharRecord.java
│   └── UdharTransactionLink.java
└── dto\
    ├── AuthResponse.java
    ├── LoginRequest.java
    ├── RegisterRequest.java
    ├── TransactionDTO.java
    ├── BudgetLimitDTO.java
    ├── AssetDTO.java
    ├── DashboardSummaryDTO.java
    ├── CashbackWalletDTO.java
    ├── CashbackEntryDTO.java
    ├── TradeDTO.java
    ├── TradeAnalyticsDTO.java
    ├── StockHoldingsDTO.java
    ├── CompoundingHistoryDTO.java
    ├── InvestmentDTO.java
    ├── ImportResponseDTO.java
    ├── TaxCalculationDTO.java
    ├── AutoCalculatedTaxDTO.java
    ├── UdharRecordDTO.java
    ├── UdharSettlementDTO.java
    └── UserProfileDTO.java
```

---

## API Endpoints

### Auth (`/api/auth/**` — all public)
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/register | Register new user (creates default budgets) |
| POST | /api/auth/login | Login, returns JWT |
| POST | /api/auth/forgot-password | Send OTP to email |
| POST | /api/auth/reset-password | Verify OTP + set new password |
| PUT | /api/auth/change-password | Change password (requires JWT) |

### Dashboard
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/dashboard/summary | totalIncome, totalExpenses, totalSavings, totalBalance, savingsRate, totalAssets, totalLiabilities, totalDebt, totalInvestments, netWorth |

### Transactions
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/transactions | All transactions (with filters) |
| GET | /api/transactions/budget/{budgetCategory} | By budget category |
| GET | /api/transactions/source/{source} | By payment source |
| GET | /api/transactions/type/{type} | By CREDIT/DEBIT |
| GET | /api/transactions/analytics/monthly | Monthly analytics |
| GET | /api/transactions/analytics/category | Category breakdown |
| POST | /api/transactions | Create transaction |
| PUT | /api/transactions/{id} | Update transaction |
| DELETE | /api/transactions/{id} | Delete transaction |

### Budgets
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/budgets | All budget limits |
| POST | /api/budgets | Create/update budget limit |
| DELETE | /api/budgets/{id} | Delete budget |

### Assets
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/assets | All assets |
| GET | /api/assets/type/{type} | By type (ASSET/LIABILITY/DEBT/INVESTMENT) |
| POST | /api/assets | Create asset |
| PUT | /api/assets/{id} | Update asset |
| DELETE | /api/assets/{id} | Delete asset |

### Cashback
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/cashback/wallets | List wallets |
| POST | /api/cashback/wallets | Create wallet |
| DELETE | /api/cashback/wallets/{id} | Delete wallet |
| GET | /api/cashback/entries | All entries |
| GET | /api/cashback/entries/wallet/{id} | Entries by wallet |
| POST | /api/cashback/entries | Add EARNED/REDEEMED |
| DELETE | /api/cashback/entries/{id} | Delete entry |

### Trading
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/trading/trades | List trades |
| POST | /api/trading/trades | Create trade |
| GET | /api/trading/holdings | Stock holdings |
| GET | /api/trading/analytics | Trading analytics |
| GET | /api/trading/compounding | Compounding history |
| POST | /api/trading/compounding | Add compounding entry |

### Investments
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/investments | List investments |
| GET | /api/investments/analytics | Portfolio analytics |
| POST | /api/investments | Create investment |
| PUT | /api/investments/{id} | Update investment |
| DELETE | /api/investments/{id} | Delete investment |

### Udhar
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/udhar/records | All udhar records |
| GET | /api/udhar/summary | Summary |
| POST | /api/udhar/records | Create record |
| POST | /api/udhar/settle | Settle udhar |
| DELETE | /api/udhar/records/{id} | Delete record |

### Tax
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/tax/profile/{financialYear} | Get tax profile |
| POST | /api/tax/profile | Save tax profile |
| POST | /api/tax/calculate | Calculate tax |
| POST | /api/tax/compare | Compare old vs new regime |
| GET | /api/tax/auto-calculate/{financialYear} | Auto calculate from transactions |

### Profile
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/profile | Get user profile |
| PUT | /api/profile | Update profile |

---

## Frontend Structure
```
E:\Finapp\frontend\src\
├── main.jsx
├── App.jsx                        # Main router with auth guards
├── api.js                         # All axios API calls (uses VITE_API_BASE_URL)
├── index.css
├── components\
│   ├── Sidebar.jsx
│   ├── Header.jsx
│   ├── StatsCard.jsx
│   ├── BudgetCard.jsx
│   ├── TransactionRow.jsx
│   ├── AddTransactionModal.jsx
│   └── AddAssetModal.jsx
└── pages\
    ├── Login.jsx                  # Has "Forgot Password?" link
    ├── Register.jsx
    ├── ForgotPassword.jsx         # 3-step: email → OTP+new password → success
    ├── Dashboard.jsx
    ├── Insights.jsx
    ├── Transactions.jsx
    ├── Analytics.jsx
    ├── Settings.jsx               # Has Change Password card
    ├── Cashback.jsx
    ├── Trading.jsx
    ├── Investments.jsx
    ├── Udhar.jsx
    └── Tax.jsx
```

---

## Key Data Models

### PasswordResetToken
```json
{
  "id": 1,
  "token": "123456",
  "email": "user@gmail.com",
  "expiresAt": "2026-08-03T17:00:00",
  "used": false
}
```

### Transaction
```json
{
  "id": 1,
  "title": "Salary Credit",
  "amount": 60000.00,
  "type": "CREDIT",
  "category": "Salary",
  "budgetCategory": "Income",
  "date": "2025-10-01",
  "description": "Monthly salary",
  "paymentSource": "HDFC Bank"
}
```

### BudgetLimit
```json
{
  "id": 1,
  "category": "Monthly Spend",
  "limitAmount": 50000.00,
  "color": "#FFA000",
  "note": "You've used 90% of your spending limit."
}
```

---

## Budget Categories
1. Monthly Spend — ₹50,000 — #FFA000
2. Monthly Total Savings — ₹10,000 — #4CAF50
3. Monthly Total Expense — ₹50,000 — #D32F2F
4. Monthly Food Expense — ₹15,000 — #4CAF50
5. Monthly Investment — ₹10,000 — #FFA000
6. Miscellaneous — ₹10,000 — #4CAF50

---

## Features Completed
- [x] JWT Authentication (Login / Register)
- [x] Forgot Password — OTP via Gmail SMTP (15 min expiry)
- [x] Change Password — Settings UI + backend
- [x] Dashboard with Stats Cards + Budget Overview
- [x] Transactions — add/edit/delete, filters, export XLSX
- [x] Insights — Assets, Liabilities, Debt, Investments, Net Worth
- [x] Analytics — monthly bar charts, category breakdown
- [x] Settings — budget limits, color picker, change password
- [x] Cashback wallet system (12 presets + custom)
- [x] Trading — trades, stock holdings, broker PDF parser
- [x] Compounding history
- [x] Investments portfolio
- [x] Udhar (lending/borrowing) system
- [x] Indian Tax Calculator (old vs new regime)
- [x] Bank statement import (PDF/CSV)
- [x] Multi-user support (JWT per user)
- [x] Dev/Prod environment separation
- [x] .gitignore (target/, node_modules/, properties files)

## Features Pending
- [ ] Notifications/Alerts when budget limit exceeded
- [ ] AI-powered spending insights
- [ ] Goal-based savings tracking
- [ ] Recurring transaction detection
- [ ] Financial health score
- [ ] UPI/SMS auto-import

---

## Important Notes
- `application-dev.properties` and `application-prod.properties` are in `.gitignore` — never committed (contain Gmail credentials)
- `backend/target/` is in `.gitignore`
- `frontend/node_modules/` and `frontend/dist/` are in `.gitignore`
- `/api/auth/**` is fully public in SecurityConfig — no JWT needed
- All other endpoints require `Authorization: Bearer <token>` header
- OTP flow: `forgotPassword()` generates 6-digit OTP, saves to `password_reset_tokens` table, sends via Gmail. `resetPassword()` validates OTP, marks as used.
