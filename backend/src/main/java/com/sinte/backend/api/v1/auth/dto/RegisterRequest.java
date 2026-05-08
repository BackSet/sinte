package com.sinte.backend.api.v1.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record RegisterRequest(
        @NotBlank @Size(max = 120) String fullName,
        @NotBlank @Email @Size(max = 180) String email,
        @NotBlank @Size(max = 30) String phone,
        @Size(max = 80) String nickname,
        @NotBlank @Size(min = 4, max = 10) String tag,
        @Min(0) @Max(99) int shirtNumber,
        @NotBlank @Size(min = 8, max = 120) String password,
        List<PositionRequest> positions
) {
    public record PositionRequest(
            @NotBlank String positionCode,
            int priority
    ) {
    }
}