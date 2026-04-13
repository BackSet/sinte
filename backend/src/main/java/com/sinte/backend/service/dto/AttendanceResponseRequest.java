package com.sinte.backend.service.dto;

import com.sinte.backend.domain.enums.AttendanceStatus;
import java.util.UUID;

public record AttendanceResponseRequest(
        UUID matchId,
        UUID userId,
        AttendanceStatus status,
        String comment
) {
}
