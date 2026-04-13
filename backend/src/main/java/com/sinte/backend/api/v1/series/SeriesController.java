package com.sinte.backend.api.v1.series;

import com.sinte.backend.config.security.SecurityUtils;
import com.sinte.backend.domain.MatchSeries;
import com.sinte.backend.domain.MatchSeriesRule;
import com.sinte.backend.domain.enums.RecurrenceType;
import com.sinte.backend.repository.MatchSeriesRuleRepository;
import com.sinte.backend.service.MatchService;
import com.sinte.backend.service.dto.CreateMatchSeriesRequest;
import com.sinte.backend.service.dto.SeriesRuleRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/series")
public class SeriesController {

    private final MatchService matchService;
    private final MatchSeriesRuleRepository matchSeriesRuleRepository;

    public SeriesController(MatchService matchService, MatchSeriesRuleRepository matchSeriesRuleRepository) {
        this.matchService = matchService;
        this.matchSeriesRuleRepository = matchSeriesRuleRepository;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<SeriesResponse> create(@Valid @RequestBody CreateSeriesApiRequest request) {
        CreateMatchSeriesRequest serviceRequest = new CreateMatchSeriesRequest(
                SecurityUtils.currentUserId(),
                request.name(),
                request.startDate(),
                request.endDate(),
                request.timezone(),
                request.location(),
                request.targetPlayers(),
                request.targetGroupIds(),
                request.rules().stream().map(this::toServiceRule).toList()
        );
        MatchSeries series = matchService.createSeries(serviceRequest);
        return ResponseEntity.ok(toResponse(series));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<List<SeriesResponse>> list() {
        return ResponseEntity.ok(matchService.listSeries().stream().map(this::toResponse).toList());
    }

    @PostMapping("/{seriesId}/generate")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<List<GeneratedMatchResponse>> generate(
            @PathVariable UUID seriesId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        List<GeneratedMatchResponse> generated = matchService.generateMatchesFromSeries(seriesId, from, to).stream()
                .map(match -> new GeneratedMatchResponse(match.getId(), match.getTitle(), match.getStartsAt(), match.getEndsAt()))
                .toList();
        return ResponseEntity.ok(generated);
    }

    @DeleteMapping("/{seriesId}")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable UUID seriesId) {
        matchService.deactivateSeries(seriesId, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }

    private SeriesRuleRequest toServiceRule(SeriesRuleApiRequest request) {
        RecurrenceType recurrenceType = request.recurrenceType();
        return new SeriesRuleRequest(
                recurrenceType,
                request.dayOfWeek() != null ? java.time.DayOfWeek.of(request.dayOfWeek()) : null,
                request.intervalDays(),
                request.dayOfMonth() != null ? Integer.valueOf(request.dayOfMonth()) : null,
                request.startTime()
        );
    }

    private SeriesResponse toResponse(MatchSeries series) {
        List<SeriesRuleResponse> rules = matchSeriesRuleRepository.findBySeriesId(series.getId()).stream()
                .map(this::toRuleResponse)
                .toList();
        return new SeriesResponse(
                series.getId(),
                series.getCreatedBy().getId(),
                series.getCreatedBy().getFullName(),
                series.getName(),
                series.getStartDate(),
                series.getEndDate(),
                series.getTimezone(),
                series.getLocation(),
                series.getTargetPlayers(),
                matchService.getSeriesTargetGroupIds(series.getId()),
                matchService.getSeriesTargetGroups(series.getId()).stream()
                        .map(group -> new GroupSummaryResponse(group.id(), group.name()))
                        .toList(),
                series.isActive(),
                series.getCreatedAt(),
                rules
        );
    }

    private SeriesRuleResponse toRuleResponse(MatchSeriesRule rule) {
        return new SeriesRuleResponse(
                rule.getRecurrenceType(),
                rule.getDayOfWeek(),
                rule.getIntervalDays(),
                rule.getDayOfMonth(),
                rule.getStartTime()
        );
    }

    public record CreateSeriesApiRequest(
            @NotBlank String name,
            @NotNull LocalDate startDate,
            LocalDate endDate,
            @NotBlank String timezone,
            String location,
            @NotNull @Min(1) Integer targetPlayers,
            List<UUID> targetGroupIds,
            @NotEmpty List<@Valid SeriesRuleApiRequest> rules
    ) {
    }

    public record SeriesRuleApiRequest(
            @NotNull RecurrenceType recurrenceType,
            @Min(1) @Max(7) Short dayOfWeek,
            @Min(1) Integer intervalDays,
            @Min(1) @Max(31) Short dayOfMonth,
            @NotNull LocalTime startTime
    ) {
    }

    public record SeriesRuleResponse(
            RecurrenceType recurrenceType,
            Short dayOfWeek,
            Integer intervalDays,
            Short dayOfMonth,
            LocalTime startTime
    ) {
    }

    public record SeriesResponse(
            UUID id,
            UUID createdByUserId,
            String createdByName,
            String name,
            LocalDate startDate,
            LocalDate endDate,
            String timezone,
            String location,
            Integer targetPlayers,
            List<UUID> targetGroupIds,
            List<GroupSummaryResponse> targetGroups,
            boolean active,
            java.time.OffsetDateTime createdAt,
            List<SeriesRuleResponse> rules
    ) {
    }

    public record GroupSummaryResponse(
            UUID id,
            String name
    ) {
    }

    public record GeneratedMatchResponse(UUID matchId, String title, java.time.OffsetDateTime startsAt, java.time.OffsetDateTime endsAt) {
    }
}
