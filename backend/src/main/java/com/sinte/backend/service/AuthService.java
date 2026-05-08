package com.sinte.backend.service;

import com.sinte.backend.api.v1.auth.dto.AuthResponse;
import com.sinte.backend.api.v1.auth.dto.LoginRequest;
import com.sinte.backend.api.v1.auth.dto.RegisterRequest;
import com.sinte.backend.api.v1.auth.dto.UpdateProfileRequest;
import com.sinte.backend.api.v1.auth.dto.UserMeResponse;
import com.sinte.backend.config.security.JwtProperties;
import com.sinte.backend.config.security.JwtService;

import com.sinte.backend.domain.RefreshToken;
import com.sinte.backend.domain.Role;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.UserPosition;
import com.sinte.backend.domain.UserRole;
import com.sinte.backend.domain.enums.RoleCode;
import com.sinte.backend.repository.PositionRepository;
import com.sinte.backend.repository.RefreshTokenRepository;
import com.sinte.backend.repository.RoleRepository;
import com.sinte.backend.repository.UserPositionRepository;
import com.sinte.backend.repository.UserRepository;
import com.sinte.backend.repository.UserRoleRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final UserHandleService userHandleService;
    private final UserPositionRepository userPositionRepository;
    private final PositionRepository positionRepository;

    public AuthService(
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            RoleRepository roleRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            JwtProperties jwtProperties,
            UserHandleService userHandleService,
            UserPositionRepository userPositionRepository,
            PositionRepository positionRepository
    ) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.roleRepository = roleRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.userHandleService = userHandleService;
        this.userPositionRepository = userPositionRepository;
        this.positionRepository = positionRepository;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = userHandleService.normalizeEmail(request.email());
        if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw new DomainException("El correo ya esta registrado");
        }

        String tag = request.tag();

        User user = new User(
                request.fullName(),
                normalizedEmail,
                request.phone(),
                request.nickname(),
                tag,
                passwordEncoder.encode(request.password())
        );
        userHandleService.ensureHandle(user, null);
        User savedUser = userRepository.save(user);

        if (request.positions() != null && !request.positions().isEmpty()) {
            for (RegisterRequest.PositionRequest posReq : request.positions()) {
                if (positionRepository.existsById(posReq.positionCode())) {
                    boolean isPrimary = posReq == request.positions().get(0);
                    UserPosition up = new UserPosition(savedUser, posReq.positionCode(), (short) posReq.priority());
                    up.setPrimary(isPrimary);
                    userPositionRepository.save(up);
                }
            }
        }

        boolean firstUser = userRepository.count() == 1;
        if (firstUser) {
            assignRole(savedUser, RoleCode.ADMIN);
            assignRole(savedUser, RoleCode.DT);
        }
        assignRole(savedUser, RoleCode.PLAYER);

        return buildAuthResponse(savedUser);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String identifier = request.identifier().trim();
        User user;
        if (userHandleService.looksLikeEmail(identifier)) {
            user = userRepository.findByEmailIgnoreCase(identifier)
                    .orElseThrow(() -> new DomainException("Credenciales invalidas"));
        } else {
            UserHandleService.HandleParts parts = userHandleService.parseHandle(identifier);
            user = userRepository.findByNicknameAndNicknameTag(parts.nickname(), parts.tag())
                    .orElseThrow(() -> new DomainException("Credenciales invalidas"));
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new DomainException("Credenciales invalidas");
        }
        if (!user.isActive()) {
            throw new DomainException("Usuario inactivo");
        }
        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse refresh(String refreshTokenRaw) {
        String tokenHash = hashToken(refreshTokenRaw);
        RefreshToken token = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new DomainException("Refresh token invalido"));

        if (token.isRevoked() || token.isExpired()) {
            throw new DomainException("Refresh token expirado o revocado");
        }

        token.revoke();
        refreshTokenRepository.save(token);
        return buildAuthResponse(token.getUser());
    }

    @Transactional
    public void logout(String refreshTokenRaw) {
        String tokenHash = hashToken(refreshTokenRaw);
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            token.revoke();
            refreshTokenRepository.save(token);
        });
    }

    @Transactional(readOnly = true)
    public UserMeResponse me(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new DomainException("Usuario no encontrado"));
        List<String> roles = loadRoleStrings(user.getId());
        return new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getNickname(),
                user.getNicknameTag(),
                userHandleService.buildHandle(user.getNickname(), user.getNicknameTag()),
                user.getShirtNumber(),
                roles
        );
    }

    @Transactional
    public UserMeResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new DomainException("Usuario no encontrado"));

        String normalizedEmail = userHandleService.normalizeEmail(request.email());
        if (!user.getEmail().equalsIgnoreCase(normalizedEmail)) {
            if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
                throw new DomainException("El correo ya esta registrado");
            }
            user.setEmail(normalizedEmail);
        }

        if (!user.getPhone().equals(request.phone())) {
            if (userRepository.findByPhone(request.phone()).isPresent()) {
                throw new DomainException("El telefono ya esta registrado");
            }
            user.setPhone(request.phone());
        }

        user.setFullName(request.fullName());
        user.setNickname(request.nickname());
        user.setShirtNumber(request.shirtNumber());
        userHandleService.ensureHandle(user, user.getId());

        userRepository.save(user);
        return me(userId);
    }

    private AuthResponse buildAuthResponse(User user) {
        List<String> roles = loadRoleStrings(user.getId());
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), roles);

        String refreshTokenRaw = generateRawRefreshToken();
        String refreshTokenHash = hashToken(refreshTokenRaw);
        OffsetDateTime expiresAt = OffsetDateTime.now().plusDays(jwtProperties.getRefreshTokenDays());
        refreshTokenRepository.save(new RefreshToken(user, refreshTokenHash, expiresAt));

        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getNickname(),
                user.getNicknameTag(),
                userHandleService.buildHandle(user.getNickname(), user.getNicknameTag()),
                roles,
                accessToken,
                refreshTokenRaw
        );
    }

    private List<String> loadRoleStrings(UUID userId) {
        return userRoleRepository.findRoleCodesByUserId(userId).stream()
                .map(Enum::name)
                .toList();
    }

    private String generateRawRefreshToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String hashToken(String tokenRaw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(tokenRaw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new DomainException("No se pudo procesar token");
        }
    }

    private void assignRole(User user, RoleCode roleCode) {
        Role role = roleRepository.findByCode(roleCode)
                .orElseGet(() -> roleRepository.save(new Role(roleCode, roleDisplayName(roleCode))));
        userRoleRepository.save(new UserRole(user, role));
    }

    private String roleDisplayName(RoleCode roleCode) {
        return switch (roleCode) {
            case ADMIN -> "Administrador";
            case DT -> "Director Tecnico";
            case PLAYER -> "Jugador";
        };
    }
}