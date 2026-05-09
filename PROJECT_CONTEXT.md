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

---

## How to Run

### Backend
```
cd E:\Finapp\backend
mvn spring-boot:run
```
Runs on: `http://localhost:8080`

### Frontend
```
cd E:\Finapp\frontend
npm run dev
```
Runs on: `http://localhost:5173`

### If port 8080 busy
```
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

---

## Database Config
- **Type:** MySQL 8.0
- **DB Name:** finappdb
- **Username:** root
- **Password:** root
- **URL:** `jdbc:mysql://localhost:3306/finappdb`
- **ddl-auto:** update (data persists on restart)

---

## Backend Structure
```
E:\Finapp\backend\src\main\java\com\finapp\
├── FinappApplication.java
├── config\
│   ├── SecurityConfig.java      # Spring Security, CORS, JWT filter chain
│   ├── JwtAuthenticationFilter.java  # JWT token validation
│   ├── DataSeeder.java          # Seeds initial data linked to user ID 1
│   └── CorsConfig.java          # [DELETED] - merged into SecurityConfig
├── controller\
│   ├── AuthController.java      # Login, register, JWT token generation
│   ├── DashboardController.java
│   ├── TransactionController.java
│   ├── BudgetLimitController.java
│   ├── AssetController.java
│   └── TradeController.java     # Trading module API endpoints
├── service\
│   ├── DashboardService.java
│   ├── TransactionService.java   # Auto-assigns orphan transactions to user
│   ├── BudgetLimitService.java   # Auto-assigns orphan budgets / creates defaults
│   ├── AssetService.java         # Auto-assigns orphan assets to user
│   ├── TradingService.java       # Trading analytics, PnL calculations, compounding
│   └── JwtService.java           # JWT token generation & validation
├── repository\
│   ├── UserRepository.java
│   ├── TransactionRepository.java
│   ├── BudgetLimitRepository.java
│   ├── AssetRepository.java
│   ├── TradeRepository.java          # Trading queries with analytics
│   └── CompoundingHistoryRepository.java
├── model\
│   ├── User.java                # User entity with @JsonIgnore on collections
│   ├── Transaction.java         # @JsonIgnoreProperties on User to prevent circular ref
│   ├── TransactionType.java     # enum: CREDIT, DEBIT
│   ├── Asset.java               # @JsonIgnoreProperties on User to prevent circular ref
│   ├── AssetType.java           # enum: ASSET, LIABILITY, DEBT, INVESTMENT
│   ├── Budget.java
│   ├── BudgetLimit.java         # Composite unique constraint (user_id, category)
│   ├── Trade.java               # Trading module - stock trades
│   ├── TradeSegment.java        # enum: EQUITY, INTRADAY, SWING, FNO, CRYPTO, MUTUAL_FUND, LONG_TERM
│   ├── TradeStatus.java         # enum: OPEN, CLOSED
│   └── CompoundingHistory.java  # Capital compounding tracking
└── dto\
    ├── RegisterRequest.java
    ├── LoginRequest.java
    ├── AuthResponse.java
    ├── TransactionDTO.java
    ├── BudgetLimitDTO.java
    ├── AssetDTO.java
    ├── DashboardSummaryDTO.java
    ├── TradeDTO.java
    ├── CompoundingHistoryDTO.java
    └── TradeAnalyticsDTO.java
```

### Security (JWT Auth)
- **Login:** `POST /api/auth/login` → returns JWT token
- **Register:** `POST /api/auth/register` → creates user + default budgets
- **Token Storage:** `localStorage.getItem('token')`
- **Auth Header:** `Authorization: Bearer <token>`

---

## API Endpoints

### Auth (JWT)
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/register | Register new user + create default budgets |
| POST | /api/auth/login | Login and get JWT token |

### Dashboard
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/dashboard/summary | Returns totalIncome, totalExpenses, totalSavings, totalBalance, savingsRate, totalAssets, totalLiabilities, totalDebt, totalInvestments, netWorth |

### Transactions
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/transactions | All transactions |
| GET | /api/transactions/budget/{budgetCategory} | By budget category |
| GET | /api/transactions/type/{type} | By type (CREDIT/DEBIT) |
| POST | /api/transactions | Create transaction |
| PUT | /api/transactions/{id} | Update transaction |
| DELETE | /api/transactions/{id} | Delete transaction |

### Budgets
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/budgets | All budget limits |
| GET | /api/budgets/{category} | By category name |
| POST | /api/budgets | Create/update budget limit |
| DELETE | /api/budgets/{id} | Delete budget |

### Trading
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/trading/trades | All trades |
| GET | /api/trading/trades/status/{status} | OPEN/CLOSED trades |
| GET | /api/trading/trades/segment/{segment} | Segment-wise trades |
| POST | /api/trading/trades | Add trade |
| PUT | /api/trading/trades/{id} | Update trade |
| DELETE | /api/trading/trades/{id} | Delete trade |
| GET | /api/trading/analytics | Trade analytics (win rate, PnL, etc.) |
| GET | /api/trading/capital | Current capital |
| GET | /api/trading/compounding | Compounding history |
| POST | /api/trading/compounding | Add compounding entry |
| DELETE | /api/trading/compounding/{id} | Delete compounding entry |

### Assets
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/assets | All assets |
| GET | /api/assets/type/{type} | By type (ASSET/LIABILITY/DEBT/INVESTMENT) |
| POST | /api/assets | Create asset |
| PUT | /api/assets/{id} | Update asset |
| DELETE | /api/assets/{id} | Delete asset |

---

## Frontend Structure
```
E:\Finapp\frontend\src\
├── main.jsx
├── App.jsx                        # Main router - switches between pages
├── api.js                         # All axios API calls to backend
├── index.css                      # Tailwind directives
├── components\
│   ├── Sidebar.jsx                # Left nav: Dashboard, Insights, Transactions, Analytics, Settings
│   ├── Header.jsx                 # Top bar with search and bell icon
│   ├── StatsCard.jsx              # Clickable stat cards (Total Balance, Income, Expenses, Savings Rate)
│   ├── BudgetCard.jsx             # Clickable budget cards with progress bar
│   ├── TransactionRow.jsx         # Single transaction row with delete on hover
│   ├── AddTransactionModal.jsx    # Modal to add transaction (CREDIT/DEBIT, category, amount, date)
│   └── AddAssetModal.jsx          # Modal to add asset/liability/debt/investment
└── pages\
    ├── Dashboard.jsx              # Main dashboard - stats + budget overview + transaction detail view
    ├── Insights.jsx               # Assets, Liabilities, Debt, Investments, Net Worth
    ├── Transactions.jsx           # All transactions with filter (ALL/CREDIT/DEBIT)
    ├── Analytics.jsx              # Bar charts (CSS-based) for income vs expense vs savings + budget utilization
    └── Settings.jsx               # Update budget limits with color picker
```

---

## Key Data Models

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
  "description": "Monthly salary"
}
```

### BudgetLimit
```json
{
  "id": 1,
  "category": "Monthly Spend",
  "limitAmount": 50000.00,
  "color": "#FFA000",
  "note": "You've used 90% of your spending limit.",
  "icon": null
}
```

### Asset
```json
{
  "id": 1,
  "name": "Savings Account",
  "value": 150000.00,
  "type": "ASSET",
  "category": "Bank",
  "date": "2025-10-01",
  "description": null
}
```

### DashboardSummary (Response)
```json
{
  "totalIncome": 77500.00,
  "totalExpenses": 45349.00,
  "totalSavings": 7500.00,
  "totalBalance": 24651.00,
  "savingsRate": 9.67,
  "totalAssets": 350000.00,
  "totalLiabilities": 15000.00,
  "totalDebt": 300000.00,
  "totalInvestments": 160000.00,
  "netWorth": 195000.00
}
```

---

## Budget Categories (used in frontend & seeded in DB)
1. Monthly Spend — limit: ₹50,000 — color: #FFA000
2. Monthly Total Savings — limit: ₹10,000 — color: #4CAF50
3. Monthly Total Expense — limit: ₹50,000 — color: #D32F2F
4. Monthly Food Expense — limit: ₹15,000 — color: #4CAF50
5. Monthly Investment — limit: ₹10,000 — color: #FFA000
6. Miscellaneous — limit: ₹10,000 — color: #4CAF50

---

## Important Fixes Applied
1. **Asset.java** — `value` renamed to `asset_value` (H2 reserved keyword, kept for MySQL too for consistency)
2. **Transaction.java & Asset.java** — enums stored as `VARCHAR` not `ENUM` type (H2 compatibility)
3. **DataSeeder.java** — checks `count() == 0` before seeding, links data to user ID 1
4. **CorsConfig.java** — [DELETED] Merged into SecurityConfig.java with specific origins + credentials
5. **SecurityConfig.java** — JWT auth, CORS with `allowCredentials(true)`, stateless session
6. **BudgetLimit.java** — Changed `@Column(unique=true)` to composite unique constraint `@UniqueConstraint(columnNames={"user_id","category"})`
7. **Circular Reference Fix** — Added `@JsonIgnore` to User collections, `@JsonIgnoreProperties` to BudgetLimit/Transaction/Asset.user
8. **BudgetLimitService.java** — Auto-assigns orphan budgets (user=null) to current user or creates new defaults
9. **TransactionService.java** — Auto-assigns orphan transactions to current user
10. **AssetService.java** — Auto-assigns orphan assets to current user
11. **AuthController.java** — Creates default budgets for new users on registration
12. **Frontend package.json** — Added `react-router-dom` dependency
13. **Frontend api.js** — Added JWT token interceptor, 401 error handling

---

## Features Completed
- [x] Dashboard with Stats Cards (Total Balance, Income, Expenses, Savings Rate)
- [x] Budget Overview with progress bars (color coded: green/yellow/red)
- [x] Click budget card → view transactions for that category
- [x] Add/Delete transactions per budget category
- [x] Credit/Debit transaction type selection
- [x] Insights tab — Assets, Liabilities, Debt, Investments, Net Worth
- [x] Add/Delete assets per type
- [x] Transactions page with ALL/CREDIT/DEBIT filter
- [x] Analytics page with CSS bar charts
- [x] Settings page to update budget limits
- [x] MySQL persistent database
- [x] Data seeder with initial sample data
- [x] JWT Authentication (Login/Signup with JWT tokens)
- [x] Multi-user support (each user has separate budgets, transactions, assets)
- [x] Auto-assignment of orphan data to users on first login
- [x] Circular reference fix in JSON serialization
- [x] **Trading Module** — Stock trades with segments (Equity, Intraday, Swing, F&O, Crypto, Mutual Fund)
- [x] **Trade Management** — Add, edit, delete trades with buy/sell prices, quantity, brokerage
- [x] **Trading Analytics** — Win rate, PnL, segment-wise performance, open positions
- [x] **Compounding Tracker** — Monthly capital growth with reinvestment tracking
- [x] **Trade Cards** — Visual trade display with profit/loss indicators

## Features Pending (To Be Added)
- [ ] Recharts pie/bar charts
- [ ] CSV Export for transactions
- [ ] Month-wise date filter
- [ ] Edit transaction (currently only add/delete)
- [ ] Notifications/Alerts when budget limit exceeded
