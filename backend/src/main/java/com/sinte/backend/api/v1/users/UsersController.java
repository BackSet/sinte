package com.sinte.backend.api.v1.users;

import com.sinte.backend.domain.User;
import com.sinte.backend.domain.UserRole;
import com.sinte.backend.domain.enums.RoleCode;
import com.sinte.backend.repository.RoleRepository;
import com.sinte.backend.repository.UserRepository;
import com.sinte.backend.repository.UserRoleRepository;
import com.sinte.backend.service.DomainException;
import com.sinte.backend.service.UserHandleService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UsersController {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserHandleService userHandleService;

    public UsersController(
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            UserHandleService userHandleService
    ) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.userHandleService = userHandleService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String role
    ) {
        List<UserResponse> users;
        if (role != null && !role.isBlank()) {
            users = userRepository.findByRole(role)
                    .stream()
                    .map(this::toResponse)
                    .toList();
        } else {
            users = userRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                    .stream()
                    .map(this::toResponse)
                    .toList();
        }
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> getById(@PathVariable UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new DomainException("Usuario no encontrado"));
        return ResponseEntity.ok(toResponse(user));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UpsertUserRequest request) {
        String normalizedEmail = userHandleService.normalizeEmail(request.email());
        if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw new DomainException("El correo ya esta registrado");
        }
        User user = new User(
                request.fullName(),
                normalizedEmail,
                request.phone(),
                request.nickname(),
                null,
                passwordEncoder.encode(request.password())
        );
        userHandleService.ensureHandle(user, null);
        User saved = userRepository.save(user);

        RoleCode roleCode = request.initialRole() != null ? request.initialRole() : RoleCode.PLAYER;
        var role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new DomainException("Rol no encontrado"));
        userRoleRepository.save(new UserRole(saved, role));
        return ResponseEntity.ok(toResponse(saved));
    }

    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> update(@PathVariable UUID userId, @Valid @RequestBody UpdateUserRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new DomainException("Usuario no encontrado"));
        String normalizedEmail = userHandleService.normalizeEmail(request.email());
        userRepository.findByEmailIgnoreCase(normalizedEmail)
                .filter(existing -> !existing.getId().equals(userId))
                .ifPresent(existing -> {
                    throw new DomainException("El correo ya esta registrado");
                });
        user.setFullName(request.fullName());
        user.setEmail(normalizedEmail);
        user.setPhone(request.phone());
        user.setNickname(request.nickname());
        userHandleService.ensureHandle(user, userId);
        User saved = userRepository.save(user);
        return ResponseEntity.ok(toResponse(saved));
    }

    @PatchMapping("/{userId}/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> setActive(@PathVariable UUID userId, @RequestParam boolean value) {
        User user = userRepository.findById(userId).orElseThrow(() -> new DomainException("Usuario no encontrado"));
        user.setActive(value);
        User saved = userRepository.save(user);
        return ResponseEntity.ok(toResponse(saved));
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID userId) {
        if (!userRepository.existsById(userId)) {
            throw new DomainException("Usuario no encontrado");
        }
        userRepository.deleteById(userId);
        return ResponseEntity.noContent().build();
    }

    private UserResponse toResponse(User user) {
        List<String> roles = userRoleRepository.findRoleCodesByUserId(user.getId()).stream()
                .map(Enum::name)
                .toList();
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getNickname(),
                user.getNicknameTag(),
                userHandleService.buildHandle(user.getNickname(), user.getNicknameTag()),
                user.isActive(),
                roles
        );
    }

    public record UserResponse(
            UUID id,
            String fullName,
            String email,
            String phone,
            String nickname,
            String nicknameTag,
            String playerHandle,
            boolean active,
            List<String> roles
    ) {
    }

    public record UpsertUserRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 180) String email,
            @NotBlank @Size(max = 30) String phone,
            @Size(max = 80) String nickname,
            @NotBlank @Size(min = 8, max = 120) String password,
            RoleCode initialRole
    ) {
    }

    public record UpdateUserRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 180) String email,
            @NotBlank @Size(max = 30) String phone,
            @Size(max = 80) String nickname
    ) {
    }
}