# Finapp - Personal Finance Tracker

A comprehensive personal finance management application with real-time insights, cashback tracking, lending management, and Indian tax calculations.

## 🚀 Features

### Core Features (Implemented)

#### 📊 Dashboard
- **Financial Overview**: Total balance, income, expenses, savings rate, and cashback balance
- **Interactive Stats Cards**: Click any stat to drill down into transaction details
- **Budget Overview**: Visual progress bars for all budget categories

#### 💰 Transactions
- **Multiple Filters**: Daily, monthly, yearly, all-time, and custom date ranges
- **Type Filtering**: All, Income (CREDIT), Expenses (DEBIT)
- **Cashback Filter**: View transactions by cashback wallet (Swiggy, Amazon Pay, etc.)
- **Export to Excel**: Download transaction history as XLSX
- **Payment Source Tracking**: Every transaction shows "Paid From" (Bank/Credit Card/Cashback)

#### 🏦 Insights (Assets & Liabilities)
- **Asset Management**: Bank accounts, investments, properties
- **Liability Tracking**: Credit cards, loans, debts
- **Investment Portfolio**: Stocks, mutual funds, gold, FDs with profit/loss tracking
- **Drill-down View**: Click any bank/credit card to see all transactions linked to it

#### 🎁 Cashback System
- **Wallet Management**: Track cashback across multiple platforms
- **12 Preset Platforms**: Swiggy, Amazon Pay, PhonePe, Google Pay, Paytm, HDFC/SBI/Axis Cards, Zomato, Flipkart, CRED, Mobikwik
- **Custom Wallets**: Add any platform with emoji picker
- **Entry Tracking**: Log EARNED and REDEEMED cashback entries
- **Balance Updates**: Automatic balance calculation per wallet
- **Utilization Stats**: See % of earned cashback that you've redeemed

#### 📈 Trading & Compounding
- **Trade Management**: Track stock trades with P&L
- **Compounding History**: Record monthly capital growth
- **Broker Tracking**: ICICI Direct, Zerodha, Upstox, etc.

---

### Planned Features

#### 🤝 Udhar (Lending/Borrowing) System
Track money lent to or borrowed from friends/family:
- Mark any transaction as "Udhar" (Diya/Liya)
- Store person's name and mobile number
- Track settlement status (PENDING/PARTIAL/SETTLED)
- View person-wise outstanding amounts
- Mark partial/full settlements

#### 🧾 Indian Tax Calculator
Complete tax computation for Indian taxpayers:
- **Dual Regime Support**: Old vs New Tax Regime comparison
- **Automatic Income Fetch**: Pulls all income from transactions
- **Deduction Inputs**: 80C, 80D, HRA, LTA, NPS (Old Regime only)
- **Visual Slab Breakdown**: See exactly which income falls in which tax slab
- **Regime Comparison**: "You save ₹X with [Old/New] regime"
- **Monthly TDS Projection**: Estimated tax per month

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Java Spring Boot 3.x
- **Language**: Java 17+
- **Database**: MySQL 8.x
- **ORM**: JPA/Hibernate
- **Auth**: JWT (JSON Web Tokens)
- **Port**: 2002

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **State**: React Hooks (useState, useEffect, useCallback)

### Database
- **Name**: `finappdb`
- **Host**: localhost:3306
- **Credentials**: root/root

---

## 📁 Project Structure

```
Finapp/
├── backend/
│   └── src/main/java/com/finapp/
│       ├── config/           # Security, CORS configs
│       ├── controller/       # REST API controllers
│       ├── dto/             # Data Transfer Objects
│       ├── model/           # JPA Entities
│       ├── repository/      # Spring Data Repositories
│       └── service/         # Business logic
├── frontend/
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/          # Route-level components
│       ├── api.js          # API functions
│       └── App.jsx         # Main app router
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Java 17+
- Node.js 18+
- MySQL 8.x
- Maven

### Backend Setup

```bash
cd backend

# 1. Configure application.properties (already done)
# 2. Build and run
./mvnw spring-boot:run
```

Database auto-creates tables on first run (`spring.jpa.hibernate.ddl-auto=update`)

### Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open browser at the displayed port
```

### Default Test Account
- **Email**: testaccount@test.com
- **Password**: (set during registration)
- **User ID**: 0 (auto-assigned)

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login, returns JWT |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions (with filters) |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/{id}` | Update transaction |
| DELETE | `/api/transactions/{id}` | Delete transaction |
| GET | `/api/transactions/budget/{category}` | By budget category |
| GET | `/api/transactions/source/{source}` | By payment source |
| GET | `/api/transactions/type/{type}` | By CREDIT/DEBIT |
| GET | `/api/transactions/analytics/monthly` | Monthly analytics |
| GET | `/api/transactions/analytics/category` | Category breakdown |

### Assets & Liabilities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List all assets |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/{id}` | Update asset |
| DELETE | `/api/assets/{id}` | Delete asset |
| GET | `/api/assets/type/{type}` | ASSET or LIABILITY |

### Cashback
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cashback/wallets` | List cashback wallets |
| POST | `/api/cashback/wallets` | Create wallet |
| DELETE | `/api/cashback/wallets/{id}` | Delete wallet |
| GET | `/api/cashback/entries` | All entries |
| GET | `/api/cashback/entries/wallet/{id}` | Entries by wallet |
| POST | `/api/cashback/entries` | Add EARNED/REDEEMED |
| DELETE | `/api/cashback/entries/{id}` | Delete entry |

### Trading
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trading/trades` | List trades |
| POST | `/api/trading/trades` | Create trade |
| GET | `/api/trading/compounding` | Compounding history |
| POST | `/api/trading/compounding` | Add entry |

### Investments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investments` | List investments |
| GET | `/api/investments/analytics` | Portfolio analytics |

### Dashboard & Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Dashboard stats |
| GET | `/api/profile` | User profile |
| PUT | `/api/profile` | Update profile |

---

## 🗄️ Database Schema

### Core Tables

#### users
```sql
id, email, password, first_name, last_name, role, 
profile_picture, phone, company, bio, created_at, updated_at
```

#### transactions
```sql
id, title, amount, type (CREDIT/DEBIT), category, budget_category, 
date, description, payment_source, user_id
```

#### assets
```sql
id, name, asset_value, type (ASSET/LIABILITY), category, 
date, description, user_id
```

#### budgets
```sql
id, category, limit_amount, period, user_id
```

#### cashback_wallets
```sql
id, platform, balance, total_earned, total_redeemed, 
icon, color, user_id
```

#### cashback_entries
```sql
id, amount, type (EARNED/REDEEMED), description, source, 
date, wallet_id, user_id
```

---

## 💡 Usage Guide

### Adding a Transaction
1. Click "Add Transaction" from any budget card or transactions page
2. Fill: Title, Amount, Date, Description
3. Select "Paid From":
   - **Banks**: HDFC, SBI, ICICI, etc.
   - **Credit Cards**: HDFC CC, Axis CC, etc.
   - **Cashback Wallets**: Swiggy Money, Amazon Pay (with current balance)
4. Save

### Tracking Cashback
1. Go to **Cashback** from sidebar
2. Click "Add Wallet" → Select preset or custom
3. For custom: Pick emoji from grid, enter platform name
4. Click any wallet card to view history
5. Click "Add Entry" → Select EARNED or REDEEMED, enter amount

### Viewing Bank Transactions
1. Go to **Insights**
2. Click any **BANK** asset card or **CREDIT_CARD** liability card
3. Click the 🧾 (receipt) icon
4. See all transactions linked to that account

### Exporting Data
1. Go to **Transactions** page
2. Set desired filter (month, date range, etc.)
3. Click "Export XLSX" button
4. Download transaction report

### Budget Management
1. Go to **Settings**
2. Under "Budget Limits", set monthly limits for each category
3. View progress on Dashboard cards

---

## 🗺️ Roadmap

### Phase 1: Core Finance ✅ COMPLETE
- [x] Transaction management
- [x] Budget tracking
- [x] Asset & liability management
- [x] Investment tracking
- [x] Payment source linking
- [x] Cashback wallet system

### Phase 2: Advanced Tracking 🔄 IN PROGRESS
- [ ] **Udhar System**: Track money lent/borrowed
  - Person-wise tracking
  - Settlement status
  - Partial payments
- [ ] **Tax Calculator**: Indian tax regime support
  - Old vs New regime comparison
  - Deduction inputs
  - Slab-wise breakdown
  - Monthly TDS projection

### Phase 3: Enhanced Analytics 📊 PLANNED
- [ ] AI-powered spending insights
- [ ] Goal-based savings tracking
- [ ] Recurring transaction detection
- [ ] Financial health score
- [ ] Year-end tax report generation

### Phase 4: Integrations 🔗 PLANNED
- [ ] Bank statement import (PDF/CSV)
- [ ] SMS transaction parsing
- [ ] UPI transaction auto-import
- [ ] Bill reminders

---

## 🐛 Troubleshooting

### Backend not starting
```bash
# Check MySQL is running
mysql -u root -p

# Check port 2002 is free
netstat -ano | findstr :2002
```

### Frontend build issues
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules
npm install
```

### Database schema issues
```sql
-- If column missing, add manually:
ALTER TABLE transactions ADD COLUMN payment_source VARCHAR(255);
```

---

## 📝 License

MIT License - Personal/Commercial use allowed

---

## 👤 Author

Built with ❤️ for personal finance management

**Questions or Suggestions?** 
- Open an issue in the repository
- Or contact the development team

---

*Last Updated: May 14, 2026*
