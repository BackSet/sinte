package com.sinte.backend.api.v1.auth;

import com.sinte.backend.api.v1.auth.dto.AuthResponse;
import com.sinte.backend.api.v1.auth.dto.LoginRequest;
import com.sinte.backend.api.v1.auth.dto.RefreshRequest;
import com.sinte.backend.api.v1.auth.dto.RegisterRequest;
import com.sinte.backend.api.v1.auth.dto.UpdateProfileRequest;
import com.sinte.backend.api.v1.auth.dto.UserMeResponse;
import com.sinte.backend.config.security.SecurityUtils;
import com.sinte.backend.service.AuthService;
import com.sinte.backend.service.UserPositionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final UserPositionService userPositionService;

    public AuthController(AuthService authService, UserPositionService userPositionService) {
        this.authService = authService;
        this.userPositionService = userPositionService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserMeResponse> me() {
        return ResponseEntity.ok(authService.me(SecurityUtils.currentUserId()));
    }

    @PutMapping("/me")
    public ResponseEntity<UserMeResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(authService.updateProfile(SecurityUtils.currentUserId(), request));
    }

    @GetMapping("/me/positions")
    public ResponseEntity<List<UserPositionService.UserPositionResponse>> myPositions() {
        return ResponseEntity.ok(userPositionService.getUserPositions(SecurityUtils.currentUserId()));
    }

    @PutMapping("/me/positions")
    public ResponseEntity<List<UserPositionService.UserPositionResponse>> updateMyPositions(
            @Valid @RequestBody List<PositionAssignmentRequest> assignments
    ) {
        java.util.UUID userId = SecurityUtils.currentUserId();
        List<UserPositionService.PositionAssignment> serviceAssignments = assignments.stream()
                .map(a -> new UserPositionService.PositionAssignment(a.positionCode(), (short) a.priority()))
                .toList();
        return ResponseEntity.ok(userPositionService.setUserPositions(userId, serviceAssignments));
    }

    public record PositionAssignmentRequest(
            @NotBlank String positionCode,
            int priority
    ) {
    }
}
