package com.sinte.backend.api.v1.matches;

import com.sinte.backend.config.security.SecurityUtils;
import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.enums.MatchStatus;
import com.sinte.backend.service.MatchExportService;
import com.sinte.backend.service.MatchService;
import com.sinte.backend.service.dto.CreateMatchRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/matches")
public class MatchesController {

    private final MatchService matchService;
    private final MatchExportService matchExportService;

    public MatchesController(MatchService matchService, MatchExportService matchExportService) {
        this.matchService = matchService;
        this.matchExportService = matchExportService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<MatchResponse> create(@Valid @RequestBody MatchUpsertRequest request) {
        CreateMatchRequest createRequest = new CreateMatchRequest(
                SecurityUtils.currentUserId(),
                request.title(),
                request.description(),
                request.location(),
                request.startsAt(),
                request.endsAt(),
                request.targetGroupIds()
        );
        Match match = matchService.createManualMatch(createRequest);
        return ResponseEntity.ok(toResponse(match));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<List<MatchResponse>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            @RequestParam(required = false) MatchStatus status
    ) {
        List<MatchResponse> matches = matchService.listMatchesForUser(SecurityUtils.currentUserId(), from, to, status).stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(matches);
    }

    @PutMapping("/{matchId}")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<MatchResponse> update(@PathVariable UUID matchId, @Valid @RequestBody MatchUpsertRequest request) {
        CreateMatchRequest updateRequest = new CreateMatchRequest(
                SecurityUtils.currentUserId(),
                request.title(),
                request.description(),
                request.location(),
                request.startsAt(),
                request.endsAt(),
                request.targetGroupIds()
        );
        Match match = matchService.updateManualMatch(matchId, updateRequest);
        return ResponseEntity.ok(toResponse(match));
    }

    @DeleteMapping("/{matchId}")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<Void> cancel(@PathVariable UUID matchId) {
        matchService.cancelMatch(matchId, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{matchId}/confirmed")
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<List<ConfirmedPlayerResponse>> confirmedPlayers(@PathVariable UUID matchId) {
        UUID userId = SecurityUtils.currentUserId();
        List<ConfirmedPlayerResponse> players = matchService.listConfirmedPlayers(userId, matchId).stream()
                .map(player -> new ConfirmedPlayerResponse(
                        player.userId(),
                        player.fullName(),
                        player.email(),
                        player.playerHandle(),
                        player.primaryPosition()
                ))
                .toList();
        return ResponseEntity.ok(players);
    }

    @GetMapping("/{matchId}/teams")
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<List<TeamResponse>> teams(@PathVariable UUID matchId) {
        UUID userId = SecurityUtils.currentUserId();
        List<TeamResponse> teams = matchService.getTeams(userId, matchId).stream()
                .map(this::toTeamResponse)
                .toList();
        return ResponseEntity.ok(teams);
    }

    @PostMapping("/{matchId}/teams/suggest")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<List<TeamResponse>> suggestTeams(
            @PathVariable UUID matchId,
            @RequestParam(defaultValue = "2") int teamSize
    ) {
        UUID userId = SecurityUtils.currentUserId();
        List<TeamResponse> teams = matchService.suggestTeams(userId, matchId, teamSize).stream()
                .map(this::toTeamResponse)
                .toList();
        return ResponseEntity.ok(teams);
    }

    @PutMapping("/{matchId}/teams")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<List<TeamResponse>> saveTeams(
            @PathVariable UUID matchId,
            @Valid @RequestBody SaveTeamsRequest request
    ) {
        UUID userId = SecurityUtils.currentUserId();
        List<MatchService.TeamAssignment> assignments = request.teams().stream()
                .map(team -> new MatchService.TeamAssignment(
                        team.teamNumber(),
                        team.name(),
                        team.playerIds()
                ))
                .toList();
        List<TeamResponse> teams = matchService.saveTeams(userId, matchId, assignments).stream()
                .map(this::toTeamResponse)
                .toList();
        return ResponseEntity.ok(teams);
    }

    @GetMapping("/{matchId}/confirmed/export")
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<byte[]> exportConfirmed(@PathVariable UUID matchId) {
        UUID userId = SecurityUtils.currentUserId();
        List<MatchService.ConfirmedPlayer> players = matchService.listConfirmedPlayers(userId, matchId);
        Match match = matchService.getMatch(matchId);
        byte[] content = matchExportService.exportConfirmedPlayersExcel(match.getTitle(), players);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"confirmados-" + matchId + ".xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(content);
    }

    private MatchResponse toResponse(Match match) {
        MatchService.AttendanceSummary attendanceSummary = matchService.getAttendanceSummary(match.getId());
        return new MatchResponse(
                match.getId(),
                match.getCreatedBy().getId(),
                match.getCreatedBy().getFullName(),
                match.getTitle(),
                match.getDescription(),
                match.getLocation(),
                match.getStartsAt(),
                match.getEndsAt(),
                match.getStatus().name(),
                match.getSourceType().name(),
                match.getSeries() != null ? match.getSeries().getId() : null,
                match.getCreatedAt(),
                matchService.getTargetGroupIds(match.getId()),
                matchService.getTargetGroups(match.getId()).stream()
                        .map(group -> new GroupSummaryResponse(group.id(), group.name()))
                        .toList(),
                attendanceSummary.confirmedCount(),
                attendanceSummary.pendingCount(),
                match.getTargetPlayers()
        );
    }

    private TeamResponse toTeamResponse(MatchService.TeamView team) {
        return new TeamResponse(
                team.teamNumber(),
                team.name(),
                team.players().stream()
                        .map(player -> new TeamPlayerResponse(
                                player.userId(),
                                player.fullName(),
                                player.playerHandle(),
                                player.primaryPosition()
                        ))
                        .toList()
        );
    }

    public record MatchUpsertRequest(
            @NotBlank String title,
            String description,
            String location,
            @NotNull OffsetDateTime startsAt,
            @NotNull OffsetDateTime endsAt,
            List<UUID> targetGroupIds
    ) {
    }

    public record MatchResponse(
            UUID id,
            UUID createdByUserId,
            String createdByName,
            String title,
            String description,
            String location,
            OffsetDateTime startsAt,
            OffsetDateTime endsAt,
            String status,
            String sourceType,
            UUID seriesId,
            OffsetDateTime createdAt,
            List<UUID> targetGroupIds,
            List<GroupSummaryResponse> targetGroups,
            long confirmedCount,
            long pendingCount,
            Integer targetPlayers
    ) {
    }

    public record GroupSummaryResponse(
            UUID id,
            String name
    ) {
    }

    public record ConfirmedPlayerResponse(
            UUID userId,
            String fullName,
            String email,
            String playerHandle,
            String primaryPosition
    ) {
    }

    public record SaveTeamsRequest(List<@Valid TeamInput> teams) {
    }

    public record TeamInput(
            @NotNull Integer teamNumber,
            String name,
            List<UUID> playerIds
    ) {
    }

    public record TeamResponse(
            Integer teamNumber,
            String name,
            List<TeamPlayerResponse> players
    ) {
    }

    public record TeamPlayerResponse(
            UUID userId,
            String fullName,
            String playerHandle,
            String primaryPosition
    ) {
    }
}
