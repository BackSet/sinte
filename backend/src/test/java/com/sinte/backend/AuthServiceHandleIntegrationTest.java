package com.sinte.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.sinte.backend.api.v1.auth.dto.AuthResponse;
import com.sinte.backend.api.v1.auth.dto.LoginRequest;
import com.sinte.backend.api.v1.auth.dto.RegisterRequest;
import com.sinte.backend.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class AuthServiceHandleIntegrationTest {

    @Autowired
    private AuthService authService;

    @Test
    void registerGeneratesHandleAndAllowsLoginWithEmailOrHandle() {
        AuthResponse registered = authService.register(new RegisterRequest(
                "Jugador Uno",
                "jugador1@test.com",
                "0991111111",
                "backset",
                "Secret123!"
        ));

        assertThat(registered.playerHandle()).matches("^[a-z0-9_]{3,20}#[A-Z0-9]{4}$");
        assertThat(registered.nickname()).isEqualTo("backset");
        assertThat(registered.nicknameTag()).hasSize(4);

        AuthResponse byEmail = authService.login(new LoginRequest("jugador1@test.com", "Secret123!"));
        AuthResponse byHandle = authService.login(new LoginRequest(registered.playerHandle(), "Secret123!"));

        assertThat(byEmail.userId()).isEqualTo(registered.userId());
        assertThat(byHandle.userId()).isEqualTo(registered.userId());
    }
}