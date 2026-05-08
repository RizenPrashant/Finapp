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
Runs on: `http://localhost:2002`

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
- **Backend Port:** 2002
- **ddl-auto:** update (data persists on restart)

---

## Backend Structure
```
E:\Finapp\backend\src\main\java\com\finapp\
├── FinappApplication.java
├── config\
│   ├── CorsConfig.java          # CORS for localhost:5173 and localhost:3000
│   └── DataSeeder.java          # Seeds initial data only if tables are empty
├── controller\
│   ├── DashboardController.java
│   ├── TransactionController.java
│   ├── BudgetLimitController.java
│   └── AssetController.java
├── service\
│   ├── DashboardService.java
│   ├── TransactionService.java
│   ├── BudgetLimitService.java
│   └── AssetService.java
├── repository\
│   ├── TransactionRepository.java
│   ├── BudgetLimitRepository.java
│   └── AssetRepository.java
├── model\
│   ├── Transaction.java         # field: type VARCHAR(10) - CREDIT/DEBIT
│   ├── TransactionType.java     # enum: CREDIT, DEBIT
│   ├── Asset.java               # field: asset_value (renamed from value - H2 reserved word fix), type VARCHAR(20)
│   ├── AssetType.java           # enum: ASSET, LIABILITY, DEBT, INVESTMENT
│   └── BudgetLimit.java
└── dto\
    ├── TransactionDTO.java
    ├── BudgetLimitDTO.java
    ├── AssetDTO.java
    └── DashboardSummaryDTO.java
```

---

## API Endpoints

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
3. **DataSeeder.java** — checks `count() == 0` before seeding to avoid duplicate entry errors on restart
4. **CorsConfig.java** — allows `localhost:5173` and `localhost:3000`

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

## Features Pending (To Be Added)
- [ ] JWT Authentication (Login/Signup)
- [ ] Recharts pie/bar charts
- [ ] CSV Export for transactions
- [ ] Month-wise date filter
- [ ] Multi-user support
- [ ] Edit transaction (currently only add/delete)
- [ ] Notifications/Alerts when budget limit exceeded
