package com.sinte.backend.config;

import com.sinte.backend.domain.Role;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.UserRole;
import com.sinte.backend.domain.enums.RoleCode;
import com.sinte.backend.repository.RoleRepository;
import com.sinte.backend.repository.UserRepository;
import com.sinte.backend.repository.UserRoleRepository;
import java.util.Locale;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminBootstrap {

    private static final String ADMIN_EMAIL = "cris.medina.morocho@gmail.com";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    public AdminBootstrap(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void ensureAdminUser() {
        String normalizedEmail = ADMIN_EMAIL.toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
        if (user == null) {
            return;
        }

        Role adminRole = roleRepository.findByCode(RoleCode.ADMIN)
                .orElseGet(() -> roleRepository.save(new Role(RoleCode.ADMIN, "Administrador")));

        boolean alreadyAdmin = userRoleRepository.existsByUserIdAndRoleCode(user.getId(), RoleCode.ADMIN);
        if (!alreadyAdmin) {
            userRoleRepository.save(new UserRole(user, adminRole));
        }
    }
}
