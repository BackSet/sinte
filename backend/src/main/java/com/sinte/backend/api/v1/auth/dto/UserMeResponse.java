package com.sinte.backend.api.v1.auth.dto;

import com.sinte.backend.domain.enums.PlayerPosition;
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
        PlayerPosition primaryPosition,
        PlayerPosition secondaryPosition,
        List<String> roles
) {
}
