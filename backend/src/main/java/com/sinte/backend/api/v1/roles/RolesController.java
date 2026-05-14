package com.sinte.backend.api.v1.roles;

import com.sinte.backend.domain.User;
import com.sinte.backend.domain.UserRole;
import com.sinte.backend.domain.enums.RoleCode;
import com.sinte.backend.repository.RoleRepository;
import com.sinte.backend.repository.UserRepository;
import com.sinte.backend.repository.UserRoleRepository;
import com.sinte.backend.service.DomainException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/roles")
public class RolesController {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    public RolesController(RoleRepository roleRepository, UserRepository userRepository, UserRoleRepository userRoleRepository) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RoleResponse>> listRoles() {
        List<RoleResponse> roles = roleRepository.findAll().stream()
                .sorted(Comparator.comparing(r -> r.getCode().name()))
                .map(role -> new RoleResponse(role.getId(), role.getCode().name(), role.getName()))
                .toList();
        return ResponseEntity.ok(roles);
    }

    @PostMapping("/users/{userId}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> assignRole(@PathVariable UUID userId, @Valid @RequestBody RoleAssignRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new DomainException("Usuario no encontrado"));
        if (userRoleRepository.existsByUserIdAndRoleCode(userId, request.roleCode())) {
            return ResponseEntity.noContent().build();
        }
        var role = roleRepository.findByCode(request.roleCode())
                .orElseThrow(() -> new DomainException("Rol no encontrado"));
        userRoleRepository.save(new UserRole(user, role));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/users/{userId}/{roleCode}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> removeRole(@PathVariable UUID userId, @PathVariable RoleCode roleCode) {
        int deleted = userRoleRepository.deleteByUserIdAndRoleCode(userId, roleCode);
        if (deleted == 0) {
            throw new DomainException("Asignacion de rol no encontrada");
        }
        return ResponseEntity.noContent().build();
    }

    public record RoleResponse(Long id, String code, String name) {
    }

    public record RoleAssignRequest(@NotNull RoleCode roleCode) {
    }
}
