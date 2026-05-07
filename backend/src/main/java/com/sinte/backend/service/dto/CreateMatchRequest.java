package com.sinte.backend.service.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CreateMatchRequest(
        UUID createdByUserId,
        UUID configId,
        String title,
        String description,
        OffsetDateTime startsAt,
        List<UUID> targetGroupIds
) {
}