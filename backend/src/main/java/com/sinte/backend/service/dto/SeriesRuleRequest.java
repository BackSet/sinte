package com.sinte.backend.service.dto;

import com.sinte.backend.domain.enums.RecurrenceType;
import java.time.DayOfWeek;
import java.time.LocalTime;

public record SeriesRuleRequest(
        RecurrenceType recurrenceType,
        DayOfWeek dayOfWeek,
        Integer intervalDays,
        Integer dayOfMonth,
        LocalTime startTime
) {
}