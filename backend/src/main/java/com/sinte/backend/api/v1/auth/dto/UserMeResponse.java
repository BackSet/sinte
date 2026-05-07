package com.sinte.backend.api.v1.auth.dto;

import java.util.List;
import java.util.UUID;

public record UserMeResponse(
        UUID userId,
        String email,
        String fullName,
        String phone,
        String nickname,
        String nicknameTag,
        String playerHandle,
        List<String> roles
) {
}