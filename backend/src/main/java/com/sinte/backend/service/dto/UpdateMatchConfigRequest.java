package com.sinte.backend.service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateMatchConfigRequest(
        @NotBlank String location,
        @NotNull @Min(1) Integer targetPlayers,
        @NotNull @Min(1) Integer durationMinutes,
        @NotBlank String timezone,
        String description
) {
}