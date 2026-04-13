package com.sinte.backend.service.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateMatchSeriesRequest(
        UUID createdByUserId,
        String name,
        LocalDate startDate,
        LocalDate endDate,
        String timezone,
        String location,
        Integer targetPlayers,
        List<UUID> targetGroupIds,
        List<SeriesRuleRequest> rules
) {
}
