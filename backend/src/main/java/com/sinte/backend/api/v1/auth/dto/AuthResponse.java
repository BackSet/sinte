package com.sinte.backend.api.v1.auth.dto;

import java.util.List;
import java.util.UUID;

public record AuthResponse(
        UUID userId,
        String email,
        String fullName,
        String nickname,
        String nicknameTag,
        String playerHandle,
        List<String> roles,
        String accessToken,
        String refreshToken
) {
}