package com.sinte.backend.service.dto;

import java.util.List;
import java.util.UUID;

public record CreateMatchSeriesRequest(
        UUID createdByUserId,
        UUID configId,
        String defaultTitle,
        String timezone,
        List<UUID> targetGroupIds,
        List<SeriesRuleRequest> rules
) {
}