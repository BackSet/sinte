package com.sinte.backend.api.v1.configs;

import com.sinte.backend.service.MatchConfigService;
import com.sinte.backend.service.dto.CreateMatchConfigRequest;
import com.sinte.backend.service.dto.UpdateMatchConfigRequest;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/configs")
public class MatchConfigController {

    private final MatchConfigService matchConfigService;

    public MatchConfigController(MatchConfigService matchConfigService) {
        this.matchConfigService = matchConfigService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<MatchConfigResponse> create(@Valid @RequestBody CreateMatchConfigRequest request) {
        var config = matchConfigService.createConfig(
                request.location(),
                request.targetPlayers(),
                request.durationMinutes(),
                request.timezone(),
                request.description()
        );
        return ResponseEntity.ok(toResponse(config));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<List<MatchConfigResponse>> list() {
        return ResponseEntity.ok(matchConfigService.listConfigs().stream().map(this::toResponse).toList());
    }

    @GetMapping("/{configId}")
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<MatchConfigResponse> get(@PathVariable UUID configId) {
        return ResponseEntity.ok(toResponse(matchConfigService.getConfig(configId)));
    }

    @PutMapping("/{configId}")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<MatchConfigResponse> update(
            @PathVariable UUID configId,
            @Valid @RequestBody UpdateMatchConfigRequest request
    ) {
        var config = matchConfigService.updateConfig(
                configId,
                request.location(),
                request.targetPlayers(),
                request.durationMinutes(),
                request.timezone(),
                request.description()
        );
        return ResponseEntity.ok(toResponse(config));
    }

    @DeleteMapping("/{configId}")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID configId) {
        matchConfigService.deleteConfig(configId);
        return ResponseEntity.noContent().build();
    }

    private MatchConfigResponse toResponse(com.sinte.backend.domain.MatchConfig config) {
        return new MatchConfigResponse(
                config.getId(),
                config.getLocation(),
                config.getTargetPlayers(),
                config.getDurationMinutes(),
                config.getTimezone(),
                config.getDescription(),
                config.getCreatedAt()
        );
    }

    public record MatchConfigResponse(
            UUID id,
            String location,
            Integer targetPlayers,
            Integer durationMinutes,
            String timezone,
            String description,
            OffsetDateTime createdAt
    ) {
    }
}