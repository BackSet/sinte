package com.sinte.backend.config.security;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

public class JwtPrincipal implements Principal {

    private final UUID userId;
    private final String email;
    private final List<String> roles;

    public JwtPrincipal(UUID userId, String email, List<String> roles) {
        this.userId = userId;
        this.email = email;
        this.roles = roles;
    }

    public UUID getUserId() {
        return userId;
    }

    @Override
    public String getName() {
        return email;
    }

    public List<String> getRoles() {
        return roles;
    }
}
