-- ============================================================
-- CASHBACK & UDHAR DUMMY DATA
-- For test account (user_id = 0)
-- Run this after application startup (tables auto-created by Hibernate)
-- ============================================================

-- ============================================================
-- CASHBACK WALLETS (Popular Indian Platforms)
-- ============================================================
INSERT INTO cashback_wallets (platform, balance, total_earned, total_redeemed, icon, color, logo_url, user_id) VALUES
('Swiggy', 450.00, 1250.00, 800.00, '🍔', '#FC8019', 'https://cdn.simpleicons.org/swiggy/FC8019', 0),
('Amazon Pay', 320.50, 2150.50, 1830.00, '🛒', '#FF9900', 'https://cdn.simpleicons.org/amazon/FF9900', 0),
('PhonePe', 175.00, 890.00, 715.00, '📱', '#5F259F', 'https://cdn.simpleicons.org/phonepe/5F259F', 0),
('CRED', 650.00, 1800.00, 1150.00, '💳', '#D9534F', 'https://cdn.simpleicons.org/cred/D9534F', 0),
('Paytm', 85.00, 1200.00, 1115.00, '💰', '#00BAF2', 'https://cdn.simpleicons.org/paytm/00BAF2', 0),
('Google Pay', 230.00, 750.00, 520.00, '🏦', '#4285F4', 'https://cdn.simpleicons.org/googlepay/4285F4', 0),
('Flipkart', 125.00, 950.00, 825.00, '🛍️', '#2874F0', 'https://cdn.simpleicons.org/flipkart/2874F0', 0),
('Zomato', 340.00, 1100.00, 760.00, '🍕', '#E23744', 'https://cdn.simpleicons.org/zomato/E23744', 0),
('Myntra', 0.00, 450.00, 450.00, '👕', '#FF0055', 'https://cdn.simpleicons.org/myntra/FF0055', 0),
('Uber', 180.00, 600.00, 420.00, '🚗', '#276EF7', 'https://cdn.simpleicons.org/uber/276EF7', 0);

-- ============================================================
-- CASHBACK ENTRIES (EARNED & REDEEMED Transactions)
-- ============================================================

-- Note: After inserting wallets, run these with actual wallet_ids
-- Or use this script after the application has assigned wallet IDs

-- Swiggy Cashback Entries
INSERT INTO cashback_entries (amount, type, description, source, date, wallet_id, user_id) VALUES
(125.00, 'EARNED', 'Food order cashback - Burger King', 'Order #SW7823', '2026-05-10', 1, 0),
(75.00, 'EARNED', 'Instamart order cashback', 'Order #SW9123', '2026-05-05', 1, 0),
(50.00, 'EARNED', 'Dineout cashback', 'Order #SW4521', '2026-04-28', 1, 0),
(200.00, 'REDEEMED', 'Applied on Pizza order', 'Order #SW8321', '2026-05-08', 1, 0),
(150.00, 'REDEEMED', 'Swiggy One membership discount', 'Membership', '2026-04-15', 1, 0),
(100.00, 'EARNED', 'Weekend special cashback', 'Offer', '2026-04-20', 1, 0),
(300.00, 'EARNED', 'Festival offer - 50% cashback', 'Diwali Offer', '2026-03-25', 1, 0),
(250.00, 'REDEEMED', 'Biryani order discount', 'Order #SW5621', '2026-03-28', 1, 0),
(150.00, 'EARNED', 'New user referral bonus', 'Referral', '2026-03-15', 1, 0),
(100.00, 'REDEEMED', 'Instamart grocery', 'Order #SW3412', '2026-03-20', 1, 0);

-- Amazon Pay Cashback Entries
INSERT INTO cashback_entries (amount, type, description, source, date, wallet_id, user_id) VALUES
(150.00, 'EARNED', 'Mobile recharge cashback', 'Recharge', '2026-05-12', 2, 0),
(200.00, 'EARNED', 'Electricity bill payment', 'Bill Pay', '2026-05-08', 2, 0),
(100.50, 'EARNED', 'Shopping order - Electronics', 'Order #AMZ452', '2026-04-25', 2, 0),
(500.00, 'EARNED', 'Prime membership reward', 'Prime', '2026-04-01', 2, 0),
(300.00, 'REDEEMED', 'Mobile purchase discount', 'Order #AMZ892', '2026-05-05', 2, 0),
(250.00, 'REDEEMED', 'Grocery order discount', 'Order #AMZ234', '2026-04-18', 2, 0),
(180.00, 'REDEEMED', 'Movie ticket booking', 'Movies', '2026-04-10', 2, 0),
(400.00, 'REDEEMED', 'Headphones purchase', 'Order #AMZ567', '2026-03-28', 2, 0),
(200.00, 'EARNED', 'Insurance premium payment', 'Insurance', '2026-03-15', 2, 0),
(350.00, 'EARNED', 'Amazon Pay ICICI card reward', 'Card Reward', '2026-03-08', 2, 0);

-- PhonePe Cashback Entries
INSERT INTO cashback_entries (amount, type, description, source, date, wallet_id, user_id) VALUES
(50.00, 'EARNED', 'UPI transaction reward', 'UPI', '2026-05-14', 3, 0),
(75.00, 'EARNED', 'Mobile recharge offer', 'Recharge', '2026-05-10', 3, 0),
(40.00, 'EARNED', 'Electricity bill cashback', 'Bill Pay', '2026-05-02', 3, 0),
(100.00, 'EARNED', 'Switch merchant offer', 'Merchant', '2026-04-25', 3, 0),
(150.00, 'EARNED', 'Flipkart order via PhonePe', 'Shopping', '2026-04-18', 3, 0),
(80.00, 'REDEEMED', 'Gold purchase', 'Digital Gold', '2026-04-20', 3, 0),
(120.00, 'REDEEMED', 'Insurance payment discount', 'Insurance', '2026-04-12', 3, 0),
(90.00, 'REDEEMED', 'Gift card purchase', 'Gift Card', '2026-04-05', 3, 0),
(60.00, 'EARNED', 'Referral bonus', 'Referral', '2026-03-28', 3, 0),
(125.00, 'REDEEMED', 'Mutual fund payment', 'SIP', '2026-03-20', 3, 0);

-- CRED Cashback Entries
INSERT INTO cashback_entries (amount, type, description, source, date, wallet_id, user_id) VALUES
(250.00, 'EARNED', 'Credit card bill payment reward', 'Bill Pay', '2026-05-12', 4, 0),
(150.00, 'EARNED', 'CRED coins converted to cashback', 'CRED Coins', '2026-05-05', 4, 0),
(100.00, 'EARNED', 'Jackpot win', 'Jackpot', '2026-04-28', 4, 0),
(200.00, 'EARNED', 'HDFC card bill reward', 'HDFC Bill', '2026-04-20', 4, 0),
(300.00, 'EARNED', 'Referral bonus', 'Referral', '2026-04-15', 4, 0),
(400.00, 'REDEEMED', 'Amazon gift card', 'Gift Card', '2026-05-08', 4, 0),
(350.00, 'REDEEMED', 'Swiggy voucher', 'Voucher', '2026-04-25', 4, 0),
(200.00, 'REDEEMED', 'Brand store discount', 'Store', '2026-04-18', 4, 0),
(100.00, 'REDEEMED', 'Movie ticket', 'BookMyShow', '2026-04-10', 4, 0),
(100.00, 'EARNED', 'Rental payment reward', 'Rent', '2026-03-30', 4, 0);

-- Paytm Cashback Entries
INSERT INTO cashback_entries (amount, type, description, source, date, wallet_id, user_id) VALUES
(25.00, 'EARNED', 'UPI send money offer', 'UPI', '2026-05-13', 5, 0),
(40.00, 'EARNED', 'Mobile recharge cashback', 'Recharge', '2026-05-08', 5, 0),
(50.00, 'EARNED', 'Postpaid bill payment', 'Bill Pay', '2026-05-01', 5, 0),
(100.00, 'EARNED', 'Movie ticket booking', 'Movies', '2026-04-25', 5, 0),
(200.00, 'EARNED', 'FastTag recharge', 'FastTag', '2026-04-18', 5, 0),
(150.00, 'REDEEMED', 'Shopping on Paytm Mall', 'Mall', '2026-05-05', 5, 0),
(300.00, 'REDEEMED', 'Flight booking discount', 'Flights', '2026-04-22', 5, 0),
(200.00, 'REDEEMED', 'Bus ticket booking', 'Bus', '2026-04-15', 5, 0),
(100.00, 'REDEEMED', 'DTH recharge', 'DTH', '2026-04-08', 5, 0),
(75.00, 'REDEEMED', 'Metro recharge', 'Metro', '2026-04-01', 5, 0);

-- Google Pay Cashback Entries
INSERT INTO cashback_entries (amount, type, description, source, date, wallet_id, user_id) VALUES
(35.00, 'EARNED', 'Scratch card reward', 'Scratch Card', '2026-05-14', 6, 0),
(50.00, 'EARNED', 'UPI payment reward', 'UPI', '2026-05-09', 6, 0),
(25.00, 'EARNED', 'Mobile recharge offer', 'Recharge', '2026-05-03', 6, 0),
(80.00, 'EARNED', 'Merchant payment cashback', 'Merchant', '2026-04-28', 6, 0),
(40.00, 'EARNED', 'Referral bonus', 'Referral', '2026-04-20', 6, 0),
(100.00, 'EARNED', 'Festival scratch card', 'Festival', '2026-04-12', 6, 0),
(60.00, 'REDEEMED', 'Brand voucher', 'Voucher', '2026-05-06', 6, 0),
(90.00, 'REDEEMED', 'Gold purchase', 'Gold', '2026-04-25', 6, 0),
(70.00, 'REDEEMED', 'Movie ticket discount', 'Movies', '2026-04-18', 6, 0),
(100.00, 'REDEEMED', 'PhonePe competitor offer', 'Offer', '2026-04-10', 6, 0);

-- Flipkart Cashback Entries
INSERT INTO cashback_entries (amount, type, description, source, date, wallet_id, user_id) VALUES
(75.00, 'EARNED', 'SuperCoins converted', 'SuperCoins', '2026-05-11', 7, 0),
(100.00, 'EARNED', 'Plus membership reward', 'Plus', '2026-05-05', 7, 0),
(50.00, 'EARNED', 'Fashion order cashback', 'Fashion', '2026-04-28', 7, 0),
(125.00, 'EARNED', 'Electronics purchase', 'Electronics', '2026-04-20', 7, 0),
(75.00, 'EARNED', 'Grocery order reward', 'Grocery', '2026-04-15', 7, 0),
(150.00, 'REDEEMED', 'Mobile phone discount', 'Mobile', '2026-05-07', 7, 0),
(200.00, 'REDEEMED', 'Laptop purchase discount', 'Laptop', '2026-04-25', 7, 0),
(100.00, 'REDEEMED', 'Shoes purchase', 'Shoes', '2026-04-18', 7, 0),
(150.00, 'REDEEMED', 'Kitchen appliances', 'Kitchen', '2026-04-12', 7, 0),
(150.00, 'EARNED', 'Big Billion Day offer', 'BBD', '2026-03-30', 7, 0);

-- Zomato Cashback Entries
INSERT INTO cashback_entries (amount, type, description, source, date, wallet_id, user_id) VALUES
(80.00, 'EARNED', 'Pro membership reward', 'Pro', '2026-05-12', 8, 0),
(60.00, 'EARNED', 'Dining order cashback', 'Dining', '2026-05-08', 8, 0),
(45.00, 'EARNED', 'Delivery order reward', 'Delivery', '2026-05-02', 8, 0),
(90.00, 'EARNED', 'Weekend dining', 'Weekend', '2026-04-25', 8, 0),
(55.00, 'EARNED', 'New restaurant offer', 'New Rest', '2026-04-18', 8, 0),
(100.00, 'REDEEMED', 'Dinner discount', 'Dinner', '2026-05-06', 8, 0),
(80.00, 'REDEEMED', 'Gold membership discount', 'Gold', '2026-04-28', 8, 0),
(60.00, 'REDEEMED', 'Biryani order', 'Biryani', '2026-04-20', 8, 0),
(50.00, 'REDEEMED', 'Lunch discount', 'Lunch', '2026-04-15', 8, 0),
(60.00, 'EARNED', 'Pizza order reward', 'Pizza', '2026-04-10', 8, 0);

-- Myntra Cashback Entries (All redeemed - 0 balance)
INSERT INTO cashback_entries (amount, type, description, source, date, wallet_id, user_id) VALUES
(100.00, 'EARNED', 'Insider reward', 'Insider', '2026-04-25', 9, 0),
(150.00, 'EARNED', 'End of Reason Sale', 'EORS', '2026-04-15', 9, 0),
(100.00, 'EARNED', 'Fashion purchase', 'Fashion', '2026-04-10', 9, 0),
(100.00, 'REDEEMED', 'Shirt purchase', 'Shirt', '2026-04-28', 9, 0),
(150.00, 'REDEEMED', 'Shoes purchase', 'Shoes', '2026-04-20', 9, 0),
(50.00, 'REDEEMED', 'Accessories', 'Accessories', '2026-04-15', 9, 0),
(50.00, 'REDEEMED', 'Delivery discount', 'Delivery', '2026-04-12', 9, 0),
(100.00, 'REDEEMED', 'Jacket purchase', 'Jacket', '2026-04-08', 9, 0);

-- Uber Cashback Entries
INSERT INTO cashback_entries (amount, type, description, source, date, wallet_id, user_id) VALUES
(40.00, 'EARNED', 'Ride reward', 'Ride', '2026-05-13', 10, 0),
(30.00, 'EARNED', 'Auto ride cashback', 'Auto', '2026-05-09', 10, 0),
(25.00, 'EARNED', 'Premier ride offer', 'Premier', '2026-05-03', 10, 0),
(50.00, 'EARNED', 'Intercity ride', 'Intercity', '2026-04-28', 10, 0),
(35.00, 'EARNED', 'UberMoto cashback', 'Moto', '2026-04-22', 10, 0),
(60.00, 'REDEEMED', 'Ride discount', 'Ride', '2026-05-08', 10, 0),
(50.00, 'REDEEMED', 'Airport ride discount', 'Airport', '2026-05-02', 10, 0),
(40.00, 'REDEEMED', 'Office commute discount', 'Commute', '2026-04-25', 10, 0),
(50.00, 'REDEEMED', 'Weekend ride', 'Weekend', '2026-04-18', 10, 0),
(60.00, 'EARNED', 'Referral bonus', 'Referral', '2026-04-12', 10, 0);

-- ============================================================
-- UDHAR RECORDS (Lending/Borrowing)
-- ============================================================

-- Udhar Given (Maine diya - Logon ne liya)
INSERT INTO udhar_records (person_name, mobile_number, total_amount, settled_amount, type, status, date, notes, user_id, created_at, updated_at) VALUES
('Rahul Sharma', '9876543210', 5000.00, 5000.00, 'GIVEN', 'SETTLED', '2026-03-15', 'Friend ko emergency me diya, full return ho gaya', 0, NOW(), NOW()),
('Priya Patel', '9123456789', 3000.00, 1500.00, 'GIVEN', 'PARTIAL', '2026-04-01', 'Room rent ke liye diya, half wapas aaya', 0, NOW(), NOW()),
('Amit Kumar', '9988776655', 10000.00, 0.00, 'GIVEN', 'PENDING', '2026-04-20', 'Business ke liye diya, abhi tak kuch nahi aaya', 0, NOW(), NOW()),
('Suresh Yadav', '8877665544', 2500.00, 2500.00, 'GIVEN', 'SETTLED', '2026-02-10', 'Bike repair ke liye diya', 0, NOW(), NOW()),
('Neha Gupta', '7766554433', 7000.00, 2000.00, 'GIVEN', 'PARTIAL', '2026-03-25', 'Medical emergency me diya', 0, NOW(), NOW()),
('Vikram Singh', '6655443322', 1500.00, 0.00, 'GIVEN', 'PENDING', '2026-05-05', 'Movie tickets ke liye diya', 0, NOW(), NOW()),
('Ankit Verma', '5544332211', 8000.00, 8000.00, 'GIVEN', 'SETTLED', '2026-01-20', 'Phone purchase ke liye, full return', 0, NOW(), NOW()),
('Pooja Reddy', '4433221100', 4500.00, 0.00, 'GIVEN', 'PENDING', '2026-04-15', 'Shopping ke liye diya', 0, NOW(), NOW()),
('Rohit Mehta', '3322110099', 1200.00, 1200.00, 'GIVEN', 'SETTLED', '2026-05-01', 'Lunch bill share', 0, NOW(), NOW()),
('Sneha Joshi', '2211009988', 6000.00, 1000.00, 'GIVEN', 'PARTIAL', '2026-02-28', 'Trip ke liye diya, thoda wapas aaya', 0, NOW(), NOW());

-- Udhar Taken (Maine liya - Ab wapas karna hai)
INSERT INTO udhar_records (person_name, mobile_number, total_amount, settled_amount, type, status, date, notes, user_id, created_at, updated_at) VALUES
('Father', '9999999999', 15000.00, 15000.00, 'TAKEN', 'SETTLED', '2026-01-15', 'Laptop ke liye liya, salary aate hi return kar diya', 0, NOW(), NOW()),
('Rakesh Bhaiya', '8888888888', 5000.00, 0.00, 'TAKEN', 'PENDING', '2026-04-10', 'Month end me paise kam the, abhi return nahi kiya', 0, NOW(), NOW()),
('Best Friend Arjun', '7777777777', 3000.00, 1500.00, 'TAKEN', 'PARTIAL', '2026-03-20', 'Party ke liye liya, half return kiya', 0, NOW(), NOW()),
('Office Colleague', '6666666666', 2000.00, 2000.00, 'TAKEN', 'SETTLED', '2026-02-05', 'Lunch ke liye liya, same day return', 0, NOW(), NOW()),
('Mother', '5555555555', 10000.00, 3000.00, 'TAKEN', 'PARTIAL', '2026-03-01', 'Room deposit ke liye liya', 0, NOW(), NOW()),
('Cousin Karan', '4444444444', 4000.00, 0.00, 'TAKEN', 'PENDING', '2026-04-25', 'Trip ke liye liya, abhi tak nahi diya', 0, NOW(), NOW()),
('Roommate', '3333333333', 1500.00, 1500.00, 'TAKEN', 'SETTLED', '2026-05-03', 'Electricity bill share', 0, NOW(), NOW()),
('Uncle', '2222222222', 8000.00, 2000.00, 'TAKEN', 'PARTIAL', '2026-02-18', 'Course fee ke liye liya', 0, NOW(), NOW()),
('GF/BF', '1111111111', 2500.00, 0.00, 'TAKEN', 'PENDING', '2026-05-10', 'Gift ke liye liya, abhi return nahi kiya', 0, NOW(), NOW()),
('Neighbor', '1234567890', 500.00, 500.00, 'TAKEN', 'SETTLED', '2026-04-30', 'Chai-pani ke liye liya, instant return', 0, NOW(), NOW());

-- ============================================================
-- COMPOUNDING HISTORY (Monthly Capital Growth)
-- ============================================================
INSERT INTO compounding_history (starting_capital, ending_capital, profit, reinvested, month, year, user_id, created_at) VALUES
-- 2025 Data (Starting capital 1 Lakh, growing monthly)
(100000.00, 112500.00, 12500.00, true, 'January', 2025, 0, NOW()),
(112500.00, 130700.00, 18200.00, true, 'February', 2025, 0, NOW()),
(130700.00, 152200.00, 21500.00, true, 'March', 2025, 0, NOW()),
(152200.00, 172000.00, 19800.00, true, 'April', 2025, 0, NOW()),
(172000.00, 194400.00, 22400.00, true, 'May', 2025, 0, NOW()),
(194400.00, 220000.00, 25600.00, true, 'June', 2025, 0, NOW()),
(220000.00, 248900.00, 28900.00, true, 'July', 2025, 0, NOW()),
(248900.00, 280100.00, 31200.00, true, 'August', 2025, 0, NOW()),
(280100.00, 308500.00, 28400.00, true, 'September', 2025, 0, NOW()),
(308500.00, 341100.00, 32600.00, true, 'October', 2025, 0, NOW()),
(341100.00, 376900.00, 35800.00, true, 'November', 2025, 0, NOW()),
(376900.00, 418100.00, 41200.00, true, 'December', 2025, 0, NOW()),
-- 2026 Data (Till May) - Higher base profits
(418100.00, 462600.00, 44500.00, true, 'January', 2026, 0, NOW()),
(462600.00, 510800.00, 48200.00, true, 'February', 2026, 0, NOW()),
(510800.00, 562900.00, 52100.00, true, 'March', 2026, 0, NOW()),
(562900.00, 612700.00, 49800.00, true, 'April', 2026, 0, NOW()),
(612700.00, 668300.00, 55600.00, true, 'May', 2026, 0, NOW());

-- ============================================================
-- SUMMARY QUERIES (Run these to verify data)
-- ============================================================

-- Check Cashback Summary:
-- SELECT platform, balance, total_earned, total_redeemed FROM cashback_wallets WHERE user_id = 0;

-- Check Udhar Summary:
-- SELECT type, status, COUNT(*), SUM(total_amount - settled_amount) as outstanding 
-- FROM udhar_records WHERE user_id = 0 GROUP BY type, status;

-- Total Given (Diye Hue): SELECT SUM(total_amount - settled_amount) FROM udhar_records WHERE type='GIVEN' AND user_id=0;
-- Total Taken (Liye Hue): SELECT SUM(total_amount - settled_amount) FROM udhar_records WHERE type='TAKEN' AND user_id=0;
-- Net Outstanding: (Total Given - Total Taken) - positive = logon ne dena hai, negative = mujhe dena hai

-- Check Compounding Summary:
-- SELECT year, month, starting_capital, profit, ending_capital FROM compounding_history WHERE user_id = 0 ORDER BY year, month;
-- Total Profit 2025: SELECT SUM(profit) FROM compounding_history WHERE year = 2025 AND user_id = 0;
-- Total Profit 2026: SELECT SUM(profit) FROM compounding_history WHERE year = 2026 AND user_id = 0;
-- Current Capital: SELECT ending_capital FROM compounding_history WHERE user_id = 0 ORDER BY created_at DESC LIMIT 1;
