package com.finapp.controller;

import com.finapp.dto.AuthResponse;
import com.finapp.dto.BudgetLimitDTO;
import com.finapp.dto.LoginRequest;
import com.finapp.dto.RegisterRequest;
import com.finapp.model.User;
import com.finapp.repository.UserRepository;
import com.finapp.service.BudgetLimitService;
import com.finapp.service.JwtService;
import java.math.BigDecimal;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final BudgetLimitService budgetLimitService;

    public AuthController(AuthenticationManager authenticationManager,
                         UserRepository userRepository,
                         PasswordEncoder passwordEncoder,
                         JwtService jwtService,
                         BudgetLimitService budgetLimitService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.budgetLimitService = budgetLimitService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Email already registered");
        }

        User user = new User();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(User.Role.USER);

        userRepository.save(user);

        // Create default budgets for new user
        createDefaultBudgets(user);

        // Generate token for new user
        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .roles(user.getRole().name())
                .build();

        String token = jwtService.generateToken(userDetails);

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .expiresIn(jwtService.getExpirationTime())
                .user(AuthResponse.UserInfo.fromUser(user))
                .build());
    }

    private void createDefaultBudgets(User user) {
        List<BudgetLimitDTO> defaultBudgets = List.of(
            createBudgetDTO("Monthly Spend", new BigDecimal("50000"), "#FFA000", "You've used 90% of your spending limit."),
            createBudgetDTO("Monthly Total Savings", new BigDecimal("10000"), "#4CAF50", "Nice! Keep saving to reach your goal."),
            createBudgetDTO("Monthly Total Expense", new BigDecimal("50000"), "#D32F2F", "Warning: You're close to your max expense."),
            createBudgetDTO("Monthly Food Expense", new BigDecimal("15000"), "#4CAF50", "You're managing food expenses well."),
            createBudgetDTO("Monthly Investment", new BigDecimal("10000"), "#FFA000", "Consider boosting investments."),
            createBudgetDTO("Miscellaneous", new BigDecimal("10000"), "#4CAF50", "Track your miscellaneous costs.")
        );
        defaultBudgets.forEach(dto -> budgetLimitService.save(dto, user));
    }

    private BudgetLimitDTO createBudgetDTO(String category, BigDecimal limit, String color, String note) {
        BudgetLimitDTO dto = new BudgetLimitDTO();
        dto.setCategory(category);
        dto.setLimitAmount(limit);
        dto.setColor(color);
        dto.setNote(note);
        return dto;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String token = jwtService.generateToken(userDetails);

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .expiresIn(jwtService.getExpirationTime())
                .user(AuthResponse.UserInfo.fromUser(user))
                .build());
    }
}
