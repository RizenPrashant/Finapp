package com.finapp.config;

import com.finapp.model.*;
import com.finapp.repository.CashbackEntryRepository;
import com.finapp.repository.CashbackWalletRepository;
import com.finapp.repository.CompoundingHistoryRepository;
import com.finapp.repository.UdharRecordRepository;
import com.finapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

/**
 * Seeds dummy data for Cashback Wallets and Udhar Records
 * Only runs when 'seed' profile is active or in dev environment
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class DummyDataSeeder {

    private final CashbackWalletRepository walletRepository;
    private final CashbackEntryRepository entryRepository;
    private final CompoundingHistoryRepository compoundingRepository;
    private final UdharRecordRepository udharRepository;
    private final UserRepository userRepository;

    @Bean
    @Profile("dev")
    public CommandLineRunner seedDummyData() {
        return args -> {
            // Get test user (user_id = 0 or first user)
            Optional<User> testUser = userRepository.findById(0L);
            if (testUser.isEmpty()) {
                testUser = userRepository.findAll().stream().findFirst();
            }

            if (testUser.isEmpty()) {
                log.warn("No user found to seed dummy data");
                return;
            }

            User user = testUser.get();
            log.info("Seeding dummy data for user: {}", user.getEmail());

            // Seed Cashback Data
            seedCashbackData(user);

            // Seed Compounding Data
            seedCompoundingData(user);

            // Seed Udhar Data
            seedUdharData(user);

            log.info("Dummy data seeding completed!");
        };
    }

    private void seedCashbackData(User user) {
        // Check if data already exists
        if (walletRepository.count() > 0) {
            log.info("Cashback data already exists, skipping...");
            return;
        }

        log.info("Seeding cashback wallets and entries...");

        // Create Wallets with CDN logos
        CashbackWallet swiggy = createWallet(user, "Swiggy", "🍔", "#FC8019", "https://cdn.simpleicons.org/swiggy/FC8019", 450, 1250, 800);
        CashbackWallet amazon = createWallet(user, "Amazon Pay", "🛒", "#FF9900", "https://cdn.simpleicons.org/amazon/FF9900", 320.50, 2150.50, 1830);
        CashbackWallet phonepe = createWallet(user, "PhonePe", "📱", "#5F259F", "https://cdn.simpleicons.org/phonepe/5F259F", 175, 890, 715);
        CashbackWallet cred = createWallet(user, "CRED", "💳", "#D9534F", "https://cdn.simpleicons.org/cred/D9534F", 650, 1800, 1150);
        CashbackWallet paytm = createWallet(user, "Paytm", "💰", "#00BAF2", "https://cdn.simpleicons.org/paytm/00BAF2", 85, 1200, 1115);
        CashbackWallet gpay = createWallet(user, "Google Pay", "🏦", "#4285F4", "https://cdn.simpleicons.org/googlepay/4285F4", 230, 750, 520);
        CashbackWallet flipkart = createWallet(user, "Flipkart", "🛍️", "#2874F0", "https://cdn.simpleicons.org/flipkart/2874F0", 125, 950, 825);
        CashbackWallet zomato = createWallet(user, "Zomato", "🍕", "#E23744", "https://cdn.simpleicons.org/zomato/E23744", 340, 1100, 760);
        CashbackWallet myntra = createWallet(user, "Myntra", "👕", "#FF0055", "https://cdn.simpleicons.org/myntra/FF0055", 0, 450, 450);
        CashbackWallet uber = createWallet(user, "Uber", "🚗", "#276EF7", "https://cdn.simpleicons.org/uber/276EF7", 180, 600, 420);

        walletRepository.save(swiggy);
        walletRepository.save(amazon);
        walletRepository.save(phonepe);
        walletRepository.save(cred);
        walletRepository.save(paytm);
        walletRepository.save(gpay);
        walletRepository.save(flipkart);
        walletRepository.save(zomato);
        walletRepository.save(myntra);
        walletRepository.save(uber);

        // Create Entries for Swiggy
        createEntry(user, swiggy, new BigDecimal("125"), CashbackEntry.CashbackType.EARNED, "Food order cashback - Burger King", "Order #SW7823", LocalDate.of(2026, 5, 10));
        createEntry(user, swiggy, new BigDecimal("200"), CashbackEntry.CashbackType.REDEEMED, "Applied on Pizza order", "Order #SW8321", LocalDate.of(2026, 5, 8));
        createEntry(user, swiggy, new BigDecimal("75"), CashbackEntry.CashbackType.EARNED, "Instamart order cashback", "Order #SW9123", LocalDate.of(2026, 5, 5));
        createEntry(user, swiggy, new BigDecimal("150"), CashbackEntry.CashbackType.REDEEMED, "Swiggy One membership discount", "Membership", LocalDate.of(2026, 4, 15));

        // Create Entries for Amazon Pay
        createEntry(user, amazon, new BigDecimal("150"), CashbackEntry.CashbackType.EARNED, "Mobile recharge cashback", "Recharge", LocalDate.of(2026, 5, 12));
        createEntry(user, amazon, new BigDecimal("200"), CashbackEntry.CashbackType.EARNED, "Electricity bill payment", "Bill Pay", LocalDate.of(2026, 5, 8));
        createEntry(user, amazon, new BigDecimal("300"), CashbackEntry.CashbackType.REDEEMED, "Mobile purchase discount", "Order #AMZ892", LocalDate.of(2026, 5, 5));
        createEntry(user, amazon, new BigDecimal("500"), CashbackEntry.CashbackType.EARNED, "Prime membership reward", "Prime", LocalDate.of(2026, 4, 1));

        // Create Entries for CRED
        createEntry(user, cred, new BigDecimal("250"), CashbackEntry.CashbackType.EARNED, "Credit card bill payment reward", "Bill Pay", LocalDate.of(2026, 5, 12));
        createEntry(user, cred, new BigDecimal("400"), CashbackEntry.CashbackType.REDEEMED, "Amazon gift card", "Gift Card", LocalDate.of(2026, 5, 8));
        createEntry(user, cred, new BigDecimal("150"), CashbackEntry.CashbackType.EARNED, "CRED coins converted to cashback", "CRED Coins", LocalDate.of(2026, 5, 5));
        createEntry(user, cred, new BigDecimal("350"), CashbackEntry.CashbackType.REDEEMED, "Swiggy voucher", "Voucher", LocalDate.of(2026, 4, 25));

        // Create Entries for Google Pay
        createEntry(user, gpay, new BigDecimal("35"), CashbackEntry.CashbackType.EARNED, "Scratch card reward", "Scratch Card", LocalDate.of(2026, 5, 14));
        createEntry(user, gpay, new BigDecimal("50"), CashbackEntry.CashbackType.EARNED, "UPI payment reward", "UPI", LocalDate.of(2026, 5, 9));
        createEntry(user, gpay, new BigDecimal("90"), CashbackEntry.CashbackType.REDEEMED, "Gold purchase", "Gold", LocalDate.of(2026, 4, 25));
        createEntry(user, gpay, new BigDecimal("70"), CashbackEntry.CashbackType.REDEEMED, "Movie ticket discount", "Movies", LocalDate.of(2026, 4, 18));

        // Create Entries for Uber
        createEntry(user, uber, new BigDecimal("40"), CashbackEntry.CashbackType.EARNED, "Ride reward", "Ride", LocalDate.of(2026, 5, 13));
        createEntry(user, uber, new BigDecimal("60"), CashbackEntry.CashbackType.REDEEMED, "Ride discount", "Ride", LocalDate.of(2026, 5, 8));
        createEntry(user, uber, new BigDecimal("50"), CashbackEntry.CashbackType.REDEEMED, "Airport ride discount", "Airport", LocalDate.of(2026, 5, 2));
        createEntry(user, uber, new BigDecimal("50"), CashbackEntry.CashbackType.EARNED, "Intercity ride", "Intercity", LocalDate.of(2026, 4, 28));

        // Create Entries for PhonePe
        createEntry(user, phonepe, new BigDecimal("50"), CashbackEntry.CashbackType.EARNED, "UPI transaction reward", "UPI", LocalDate.of(2026, 5, 14));
        createEntry(user, phonepe, new BigDecimal("75"), CashbackEntry.CashbackType.EARNED, "Mobile recharge offer", "Recharge", LocalDate.of(2026, 5, 10));
        createEntry(user, phonepe, new BigDecimal("40"), CashbackEntry.CashbackType.EARNED, "Electricity bill cashback", "Bill Pay", LocalDate.of(2026, 5, 2));
        createEntry(user, phonepe, new BigDecimal("80"), CashbackEntry.CashbackType.REDEEMED, "Gold purchase", "Digital Gold", LocalDate.of(2026, 5, 5));
        createEntry(user, phonepe, new BigDecimal("120"), CashbackEntry.CashbackType.REDEEMED, "Insurance payment discount", "Insurance", LocalDate.of(2026, 4, 20));
        createEntry(user, phonepe, new BigDecimal("60"), CashbackEntry.CashbackType.EARNED, "Referral bonus", "Referral", LocalDate.of(2026, 4, 15));

        // Create Entries for Paytm
        createEntry(user, paytm, new BigDecimal("25"), CashbackEntry.CashbackType.EARNED, "UPI send money offer", "UPI", LocalDate.of(2026, 5, 13));
        createEntry(user, paytm, new BigDecimal("40"), CashbackEntry.CashbackType.EARNED, "Mobile recharge cashback", "Recharge", LocalDate.of(2026, 5, 8));
        createEntry(user, paytm, new BigDecimal("50"), CashbackEntry.CashbackType.EARNED, "Postpaid bill payment", "Bill Pay", LocalDate.of(2026, 5, 1));
        createEntry(user, paytm, new BigDecimal("150"), CashbackEntry.CashbackType.REDEEMED, "Shopping on Paytm Mall", "Mall", LocalDate.of(2026, 4, 25));
        createEntry(user, paytm, new BigDecimal("300"), CashbackEntry.CashbackType.REDEEMED, "Flight booking discount", "Flights", LocalDate.of(2026, 4, 18));
        createEntry(user, paytm, new BigDecimal("200"), CashbackEntry.CashbackType.REDEEMED, "Bus ticket booking", "Bus", LocalDate.of(2026, 4, 12));

        // Create Entries for Flipkart
        createEntry(user, flipkart, new BigDecimal("75"), CashbackEntry.CashbackType.EARNED, "SuperCoins converted", "SuperCoins", LocalDate.of(2026, 5, 11));
        createEntry(user, flipkart, new BigDecimal("100"), CashbackEntry.CashbackType.EARNED, "Plus membership reward", "Plus", LocalDate.of(2026, 5, 5));
        createEntry(user, flipkart, new BigDecimal("50"), CashbackEntry.CashbackType.EARNED, "Fashion order cashback", "Fashion", LocalDate.of(2026, 4, 28));
        createEntry(user, flipkart, new BigDecimal("150"), CashbackEntry.CashbackType.REDEEMED, "Mobile phone discount", "Mobile", LocalDate.of(2026, 5, 7));
        createEntry(user, flipkart, new BigDecimal("200"), CashbackEntry.CashbackType.REDEEMED, "Laptop purchase discount", "Laptop", LocalDate.of(2026, 4, 22));
        createEntry(user, flipkart, new BigDecimal("100"), CashbackEntry.CashbackType.REDEEMED, "Shoes purchase", "Shoes", LocalDate.of(2026, 4, 15));
        createEntry(user, flipkart, new BigDecimal("150"), CashbackEntry.CashbackType.EARNED, "Big Billion Day offer", "BBD", LocalDate.of(2026, 3, 30));

        // Create Entries for Zomato
        createEntry(user, zomato, new BigDecimal("80"), CashbackEntry.CashbackType.EARNED, "Pro membership reward", "Pro", LocalDate.of(2026, 5, 12));
        createEntry(user, zomato, new BigDecimal("60"), CashbackEntry.CashbackType.EARNED, "Dining order cashback", "Dining", LocalDate.of(2026, 5, 8));
        createEntry(user, zomato, new BigDecimal("45"), CashbackEntry.CashbackType.EARNED, "Delivery order reward", "Delivery", LocalDate.of(2026, 5, 2));
        createEntry(user, zomato, new BigDecimal("100"), CashbackEntry.CashbackType.REDEEMED, "Dinner discount", "Dinner", LocalDate.of(2026, 5, 6));
        createEntry(user, zomato, new BigDecimal("80"), CashbackEntry.CashbackType.REDEEMED, "Gold membership discount", "Gold", LocalDate.of(2026, 4, 28));
        createEntry(user, zomato, new BigDecimal("60"), CashbackEntry.CashbackType.REDEEMED, "Biryani order", "Biryani", LocalDate.of(2026, 4, 20));
        createEntry(user, zomato, new BigDecimal("60"), CashbackEntry.CashbackType.EARNED, "Pizza order reward", "Pizza", LocalDate.of(2026, 4, 10));

        // Create Entries for Myntra (all redeemed - 0 balance)
        createEntry(user, myntra, new BigDecimal("100"), CashbackEntry.CashbackType.EARNED, "Insider reward", "Insider", LocalDate.of(2026, 4, 25));
        createEntry(user, myntra, new BigDecimal("150"), CashbackEntry.CashbackType.EARNED, "End of Reason Sale", "EORS", LocalDate.of(2026, 4, 15));
        createEntry(user, myntra, new BigDecimal("100"), CashbackEntry.CashbackType.EARNED, "Fashion purchase", "Fashion", LocalDate.of(2026, 4, 10));
        createEntry(user, myntra, new BigDecimal("100"), CashbackEntry.CashbackType.REDEEMED, "Shirt purchase", "Shirt", LocalDate.of(2026, 4, 28));
        createEntry(user, myntra, new BigDecimal("150"), CashbackEntry.CashbackType.REDEEMED, "Shoes purchase", "Shoes", LocalDate.of(2026, 4, 20));
        createEntry(user, myntra, new BigDecimal("50"), CashbackEntry.CashbackType.REDEEMED, "Accessories", "Accessories", LocalDate.of(2026, 4, 15));
        createEntry(user, myntra, new BigDecimal("50"), CashbackEntry.CashbackType.REDEEMED, "Delivery discount", "Delivery", LocalDate.of(2026, 4, 12));

        log.info("Created {} cashback wallets with entries", walletRepository.count());
    }

    private CashbackWallet createWallet(User user, String platform, String icon, String color, String logoUrl,
                                       double balance, double earned, double redeemed) {
        return CashbackWallet.builder()
                .platform(platform)
                .icon(icon)
                .color(color)
                .logoUrl(logoUrl)
                .balance(new BigDecimal(balance))
                .totalEarned(new BigDecimal(earned))
                .totalRedeemed(new BigDecimal(redeemed))
                .user(user)
                .build();
    }

    private void seedCompoundingData(User user) {
        // Check if data already exists
        if (compoundingRepository.count() > 0) {
            log.info("Compounding data already exists, skipping...");
            return;
        }

        log.info("Seeding compounding history...");

        // 2025 Data - Starting capital and growth
        double[] monthlyProfits2025 = {12500, 18200, 21500, 19800, 22400, 25600, 28900, 31200, 28400, 32600, 35800, 41200};
        double capital2025 = 100000; // Starting capital 1 Lakh

        String[] months = {"January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"};

        for (int i = 0; i < 12; i++) {
            double startingCap = capital2025;
            double profit = monthlyProfits2025[i];
            capital2025 += profit; // Reinvested

            createCompounding(user, new BigDecimal(startingCap), new BigDecimal(capital2025),
                    new BigDecimal(profit), true, months[i], 2025);
        }

        // 2026 Data (till May) - Higher base, consistent profits
        double[] monthlyProfits2026 = {44500, 48200, 52100, 49800, 55600};
        double capital2026 = capital2025; // Carry forward from 2025

        for (int i = 0; i < 5; i++) {
            double startingCap = capital2026;
            double profit = monthlyProfits2026[i];
            capital2026 += profit;

            createCompounding(user, new BigDecimal(startingCap), new BigDecimal(capital2026),
                    new BigDecimal(profit), true, months[i], 2026);
        }

        log.info("Created {} compounding records", compoundingRepository.count());
    }

    private void createCompounding(User user, BigDecimal starting, BigDecimal ending,
                                  BigDecimal profit, boolean reinvested, String month, int year) {
        CompoundingHistory history = CompoundingHistory.builder()
                .startingCapital(starting)
                .endingCapital(ending)
                .profit(profit)
                .reinvested(reinvested)
                .month(month)
                .year(year)
                .user(user)
                .build();
        compoundingRepository.save(history);
    }

    private void createEntry(User user, CashbackWallet wallet, BigDecimal amount, 
                           CashbackEntry.CashbackType type, String description, String source, LocalDate date) {
        CashbackEntry entry = CashbackEntry.builder()
                .amount(amount)
                .type(type)
                .description(description)
                .source(source)
                .date(date)
                .wallet(wallet)
                .user(user)
                .build();
        entryRepository.save(entry);
    }

    private void seedUdharData(User user) {
        // Check if data already exists
        if (udharRepository.count() > 0) {
            log.info("Udhar data already exists, skipping...");
            return;
        }

        log.info("Seeding udhar records...");

        // GIVEN (Maine diya) - SETTLED
        createUdhar(user, "Rahul Sharma", "9876543210", 5000, 5000, UdharRecord.UdharType.GIVEN, 
                   UdharRecord.UdharStatus.SETTLED, LocalDate.of(2026, 3, 15), 
                   "Friend ko emergency me diya, full return ho gaya");

        // GIVEN (Maine diya) - PARTIAL
        createUdhar(user, "Priya Patel", "9123456789", 3000, 1500, UdharRecord.UdharType.GIVEN, 
                   UdharRecord.UdharStatus.PARTIAL, LocalDate.of(2026, 4, 1), 
                   "Room rent ke liye diya, half wapas aaya");

        // GIVEN (Maine diya) - PENDING
        createUdhar(user, "Amit Kumar", "9988776655", 10000, 0, UdharRecord.UdharType.GIVEN, 
                   UdharRecord.UdharStatus.PENDING, LocalDate.of(2026, 4, 20), 
                   "Business ke liye diya, abhi tak kuch nahi aaya");

        // GIVEN - More records
        createUdhar(user, "Suresh Yadav", "8877665544", 2500, 2500, UdharRecord.UdharType.GIVEN, 
                   UdharRecord.UdharStatus.SETTLED, LocalDate.of(2026, 2, 10), "Bike repair ke liye diya");
        
        createUdhar(user, "Neha Gupta", "7766554433", 7000, 2000, UdharRecord.UdharType.GIVEN, 
                   UdharRecord.UdharStatus.PARTIAL, LocalDate.of(2026, 3, 25), "Medical emergency me diya");
        
        createUdhar(user, "Vikram Singh", "6655443322", 1500, 0, UdharRecord.UdharType.GIVEN, 
                   UdharRecord.UdharStatus.PENDING, LocalDate.of(2026, 5, 5), "Movie tickets ke liye diya");
        
        createUdhar(user, "Ankit Verma", "5544332211", 8000, 8000, UdharRecord.UdharType.GIVEN, 
                   UdharRecord.UdharStatus.SETTLED, LocalDate.of(2026, 1, 20), "Phone purchase ke liye, full return");
        
        createUdhar(user, "Pooja Reddy", "4433221100", 4500, 0, UdharRecord.UdharType.GIVEN, 
                   UdharRecord.UdharStatus.PENDING, LocalDate.of(2026, 4, 15), "Shopping ke liye diya");
        
        createUdhar(user, "Rohit Mehta", "3322110099", 1200, 1200, UdharRecord.UdharType.GIVEN, 
                   UdharRecord.UdharStatus.SETTLED, LocalDate.of(2026, 5, 1), "Lunch bill share");
        
        createUdhar(user, "Sneha Joshi", "2211009988", 6000, 1000, UdharRecord.UdharType.GIVEN, 
                   UdharRecord.UdharStatus.PARTIAL, LocalDate.of(2026, 2, 28), "Trip ke liye diya, thoda wapas aaya");

        // TAKEN (Maine liya) - SETTLED
        createUdhar(user, "Father", "9999999999", 15000, 15000, UdharRecord.UdharType.TAKEN, 
                   UdharRecord.UdharStatus.SETTLED, LocalDate.of(2026, 1, 15), 
                   "Laptop ke liye liya, salary aate hi return kar diya");
        
        createUdhar(user, "Office Colleague", "6666666666", 2000, 2000, UdharRecord.UdharType.TAKEN, 
                   UdharRecord.UdharStatus.SETTLED, LocalDate.of(2026, 2, 5), "Lunch ke liye liya, same day return");
        
        createUdhar(user, "Roommate", "3333333333", 1500, 1500, UdharRecord.UdharType.TAKEN, 
                   UdharRecord.UdharStatus.SETTLED, LocalDate.of(2026, 5, 3), "Electricity bill share");
        
        createUdhar(user, "Neighbor", "1234567890", 500, 500, UdharRecord.UdharType.TAKEN, 
                   UdharRecord.UdharStatus.SETTLED, LocalDate.of(2026, 4, 30), "Chai-pani ke liye liya, instant return");

        // TAKEN - PARTIAL
        createUdhar(user, "Best Friend Arjun", "7777777777", 3000, 1500, UdharRecord.UdharType.TAKEN, 
                   UdharRecord.UdharStatus.PARTIAL, LocalDate.of(2026, 3, 20), "Party ke liye liya, half return kiya");
        
        createUdhar(user, "Mother", "5555555555", 10000, 3000, UdharRecord.UdharType.TAKEN, 
                   UdharRecord.UdharStatus.PARTIAL, LocalDate.of(2026, 3, 1), "Room deposit ke liye liya");
        
        createUdhar(user, "Uncle", "2222222222", 8000, 2000, UdharRecord.UdharType.TAKEN, 
                   UdharRecord.UdharStatus.PARTIAL, LocalDate.of(2026, 2, 18), "Course fee ke liye liya");

        // TAKEN - PENDING
        createUdhar(user, "Rakesh Bhaiya", "8888888888", 5000, 0, UdharRecord.UdharType.TAKEN, 
                   UdharRecord.UdharStatus.PENDING, LocalDate.of(2026, 4, 10), 
                   "Month end me paise kam the, abhi return nahi kiya");
        
        createUdhar(user, "Cousin Karan", "4444444444", 4000, 0, UdharRecord.UdharType.TAKEN, 
                   UdharRecord.UdharStatus.PENDING, LocalDate.of(2026, 4, 25), "Trip ke liye liya, abhi tak nahi diya");
        
        createUdhar(user, "GF/BF", "1111111111", 2500, 0, UdharRecord.UdharType.TAKEN, 
                   UdharRecord.UdharStatus.PENDING, LocalDate.of(2026, 5, 10), "Gift ke liye liya, abhi return nahi kiya");

        log.info("Created {} udhar records", udharRepository.count());
    }

    private void createUdhar(User user, String personName, String mobile, double total, double settled, 
                           UdharRecord.UdharType type, UdharRecord.UdharStatus status, 
                           LocalDate date, String notes) {
        UdharRecord record = UdharRecord.builder()
                .personName(personName)
                .mobileNumber(mobile)
                .totalAmount(new BigDecimal(total))
                .settledAmount(new BigDecimal(settled))
                .type(type)
                .status(status)
                .date(date)
                .notes(notes)
                .user(user)
                .build();
        udharRepository.save(record);
    }
}
