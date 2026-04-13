package com.sinte.backend.service.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CreateMatchRequest(
        UUID createdByUserId,
        String title,
        String description,
        String location,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        List<UUID> targetGroupIds
) {
}
