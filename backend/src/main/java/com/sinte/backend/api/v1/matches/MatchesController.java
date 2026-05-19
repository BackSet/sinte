package com.sinte.backend.api.v1.matches;

import com.sinte.backend.config.security.SecurityUtils;
import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.Attendance;
import com.sinte.backend.domain.enums.AttendanceStatus;
import com.sinte.backend.domain.enums.MatchStatus;
import com.sinte.backend.service.AttendanceService;
import com.sinte.backend.service.MatchExportService;
import com.sinte.backend.service.MatchPairingService;
import com.sinte.backend.service.MatchService;
import com.sinte.backend.service.dto.CreateMatchRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.ArrayList;
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
    private final MatchPairingService pairingService;
    private final AttendanceService attendanceService;

    public MatchesController(MatchService matchService, MatchExportService matchExportService, MatchPairingService pairingService, AttendanceService attendanceService) {
        this.matchService = matchService;
        this.matchExportService = matchExportService;
        this.pairingService = pairingService;
        this.attendanceService = attendanceService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<MatchResponse> create(@Valid @RequestBody MatchUpsertRequest request) {
        CreateMatchRequest createRequest = new CreateMatchRequest(
                SecurityUtils.currentUserId(),
                request.configId(),
                request.title(),
                request.description(),
                request.startsAt(),
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
        matchService.closeStaleMatches();
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
                request.configId(),
                request.title(),
                request.description(),
                request.startsAt(),
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

    @DeleteMapping("/{matchId}/delete")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID matchId) {
        matchService.deleteMatch(matchId, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{matchId}/confirmed")
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<ConfirmedPlayersResponse> confirmedPlayers(@PathVariable UUID matchId) {
        UUID userId = SecurityUtils.currentUserId();
        List<ConfirmedPlayerResponse> users = matchService.listConfirmedPlayers(userId, matchId).stream()
                .map(player -> new ConfirmedPlayerResponse(
                        player.userId(),
                        null,
                        player.fullName(),
                        player.email(),
                        player.playerHandle()
                ))
                .toList();
        List<ConfirmedPlayerResponse> guests = matchService.listConfirmedGuests(userId, matchId).stream()
                .map(player -> new ConfirmedPlayerResponse(
                        null,
                        player.attendanceId(),
                        player.fullName(),
                        null,
                        null
                ))
                .toList();
        List<ConfirmedPlayerResponse> all = new ArrayList<>(users);
        all.addAll(guests);
        return ResponseEntity.ok(new ConfirmedPlayersResponse(all));
    }

    @GetMapping("/{matchId}/roster")
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<RosterResponse> roster(@PathVariable UUID matchId) {
        UUID userId = SecurityUtils.currentUserId();
        MatchService.RosterView roster = matchService.getRoster(userId, matchId);
        return ResponseEntity.ok(toRosterResponse(roster));
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
                        team.playerIds(),
                        team.attendanceIds()
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

    @GetMapping("/{matchId}/pairs/preview")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<PairingPreviewResponse> previewPairs(@PathVariable UUID matchId) {
        UUID userId = SecurityUtils.currentUserId();
        MatchPairingService.PairingResult result = pairingService.previewPairs(matchId, userId);
        return ResponseEntity.ok(toPairingPreviewResponse(result));
    }

    @PostMapping("/{matchId}/pairs")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<PairingPreviewResponse> generatePairs(@PathVariable UUID matchId) {
        UUID userId = SecurityUtils.currentUserId();
        MatchPairingService.PairingResult result = pairingService.executePairing(matchId, userId);
        return ResponseEntity.ok(toPairingPreviewResponse(result));
    }

    @PostMapping("/{matchId}/pairs/manual")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<PairingPreviewResponse> createManualPair(
            @PathVariable UUID matchId,
            @Valid @RequestBody ManualPairRequest request
    ) {
        UUID userId = SecurityUtils.currentUserId();
        MatchPairingService.PairingResult result = pairingService.createManualPair(
                matchId,
                userId,
                request.playerAId(),
                request.playerBId(),
                request.attendanceAId(),
                request.attendanceBId(),
                request.positionCode()
        );
        return ResponseEntity.ok(toPairingPreviewResponse(result));
    }

    @DeleteMapping("/{matchId}/pairs/{pairId}")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<Void> deletePair(@PathVariable UUID matchId, @PathVariable UUID pairId) {
        UUID userId = SecurityUtils.currentUserId();
        pairingService.deletePair(matchId, pairId, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{matchId}/pairs/draw")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<Void> drawAndAssignTeams(@PathVariable UUID matchId) {
        UUID userId = SecurityUtils.currentUserId();
        pairingService.executeDrawAndAssignTeams(matchId, userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{matchId}/pairs")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<Void> resetPairs(@PathVariable UUID matchId) {
        UUID userId = SecurityUtils.currentUserId();
        pairingService.resetPairsAndTeams(matchId, userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{matchId}/attendance-open")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<Void> toggleAttendanceOpen(@PathVariable UUID matchId, @RequestParam boolean open) {
        Match match = matchService.getMatch(matchId);
        match.setAttendanceOpen(open);
        matchService.getMatch(matchId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{matchId}/attendances")
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<List<AttendanceItemResponse>> listAttendances(@PathVariable UUID matchId) {
        UUID userId = SecurityUtils.currentUserId();
        List<Attendance> attendances = attendanceService.getAttendanceByMatch(matchId, userId);
        return ResponseEntity.ok(attendances.stream().map(this::toAttendanceItem).toList());
    }

    @PostMapping("/{matchId}/attendances")
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<AttendanceItemResponse> createExternal(
            @PathVariable UUID matchId,
            @Valid @RequestBody CreateExternalRequest request
    ) {
        Match match = matchService.getMatch(matchId);
        Attendance attendance = attendanceService.createExternal(match, request.externalName(), null);
        return ResponseEntity.ok(toAttendanceItem(attendance));
    }

    @PutMapping("/{matchId}/attendances/{attendanceId}/status")
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<AttendanceItemResponse> updateExternalStatus(
            @PathVariable UUID matchId,
            @PathVariable UUID attendanceId,
            @Valid @RequestBody UpdateExternalStatusRequest request
    ) {
        Attendance attendance = attendanceService.updateExternalStatus(attendanceId, request.status());
        return ResponseEntity.ok(toAttendanceItem(attendance));
    }

    @DeleteMapping("/{matchId}/attendances/{attendanceId}")
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<Void> deleteExternal(
            @PathVariable UUID matchId,
            @PathVariable UUID attendanceId
    ) {
        attendanceService.deleteExternal(attendanceId);
        return ResponseEntity.noContent().build();
    }

    private AttendanceItemResponse toAttendanceItem(Attendance a) {
        return new AttendanceItemResponse(
                a.getId(),
                a.getMatch().getId(),
                a.getUser() != null ? a.getUser().getId() : null,
                a.getExternalName(),
                a.getInvitedBy() != null ? a.getInvitedBy().getId() : null,
                a.getStatus().name(),
                a.getRespondedAt(),
                a.getCreatedAt(),
                a.getDisplayName()
        );
    }

    public record CreateExternalRequest(
            @NotBlank String externalName
    ) {}

    public record UpdateExternalStatusRequest(
            @NotNull AttendanceStatus status
    ) {}

    public record AttendanceItemResponse(
            UUID id,
            UUID matchId,
            UUID userId,
            String externalName,
            UUID invitedByUserId,
            String status,
            OffsetDateTime respondedAt,
            OffsetDateTime createdAt,
            String displayName
    ) {}

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
                match.getConfig() != null ? match.getConfig().getId() : null,
                match.getSeries() != null ? match.getSeries().getId() : null,
                match.getCreatedAt(),
                matchService.getTargetGroupIds(match.getId()),
                matchService.getTargetGroups(match.getId()).stream()
                        .map(group -> new GroupSummaryResponse(group.id(), group.name()))
                        .toList(),
                attendanceSummary.confirmedCount(),
                attendanceSummary.pendingCount(),
                match.getTargetPlayers(),
                match.isAttendanceOpen()
        );
    }

    private TeamResponse toTeamResponse(MatchService.TeamView team) {
        return new TeamResponse(
                team.teamNumber(),
                team.name(),
                team.players().stream()
                        .map(player -> new TeamPlayerResponse(
                                player.userId(),
                                player.attendanceId(),
                                player.fullName(),
                                player.playerHandle(),
                                player.primaryPositionCode()
                        ))
                        .toList()
        );
    }

    private RosterResponse toRosterResponse(MatchService.RosterView roster) {
        return new RosterResponse(
                roster.roster().stream().map(this::toRosterPlayerResponse).toList(),
                roster.waitlist().stream().map(this::toRosterPlayerResponse).toList(),
                roster.cancelled().stream().map(this::toRosterPlayerResponse).toList()
        );
    }

    private RosterPlayerResponse toRosterPlayerResponse(MatchService.RosterPlayerEntry entry) {
        return new RosterPlayerResponse(
                entry.userId(),
                entry.attendanceId(),
                entry.fullName(),
                entry.email(),
                entry.playerHandle(),
                entry.primaryPositionCode(),
                entry.respondedAt()
        );
    }

    private PairingPreviewResponse toPairingPreviewResponse(MatchPairingService.PairingResult result) {
        return new PairingPreviewResponse(
                result.pairs().stream().map(this::toPairResponse).toList(),
                result.unpaired().stream().map(this::toPairingPlayerResponse).toList(),
                result.cupReached(),
                result.totalConfirmed()
        );
    }

    private PairResponse toPairResponse(MatchPairingService.PairView pair) {
        return new PairResponse(
                pair.id(),
                pair.positionCode(),
                toPairingPlayerResponse(pair.playerA()),
                toPairingPlayerResponse(pair.playerB())
        );
    }

    private PairingPlayerResponse toPairingPlayerResponse(MatchPairingService.PairingPlayer player) {
        return new PairingPlayerResponse(
                player.userId(),
                player.attendanceId(),
                player.fullName(),
                player.playerHandle(),
                player.primaryPositionCode(),
                player.secondaryPositionCode(),
                player.isPrimary()
        );
    }

    public record MatchUpsertRequest(
            @NotBlank String title,
            String description,
            @NotNull UUID configId,
            @NotNull OffsetDateTime startsAt,
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
            UUID configId,
            UUID seriesId,
            OffsetDateTime createdAt,
            List<UUID> targetGroupIds,
            List<GroupSummaryResponse> targetGroups,
            long confirmedCount,
            long pendingCount,
            Integer targetPlayers,
            boolean attendanceOpen
    ) {
    }

    public record GroupSummaryResponse(
            UUID id,
            String name
    ) {
    }

    public record ConfirmedPlayerResponse(
            UUID userId,
            UUID attendanceId,
            String fullName,
            String email,
            String playerHandle
    ) {
    }

    public record ConfirmedPlayersResponse(
            List<ConfirmedPlayerResponse> players
    ) {
    }

    public record SaveTeamsRequest(List<@Valid TeamInput> teams) {
    }

    public record TeamInput(
            @NotNull Integer teamNumber,
            String name,
            List<UUID> playerIds,
            List<UUID> attendanceIds
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
            UUID attendanceId,
            String fullName,
            String playerHandle,
            String primaryPositionCode
    ) {
    }

    public record RosterResponse(
            List<RosterPlayerResponse> roster,
            List<RosterPlayerResponse> waitlist,
            List<RosterPlayerResponse> cancelled
    ) {
    }

    public record RosterPlayerResponse(
            UUID userId,
            UUID attendanceId,
            String fullName,
            String email,
            String playerHandle,
            String primaryPositionCode,
            OffsetDateTime respondedAt
    ) {
    }

    public record PairingPreviewResponse(
            List<PairResponse> pairs,
            List<PairingPlayerResponse> unpaired,
            boolean cupReached,
            int totalConfirmed
    ) {
    }

    public record PairResponse(
            UUID id,
            String positionCode,
            PairingPlayerResponse playerA,
            PairingPlayerResponse playerB
    ) {
    }

    public record PairingPlayerResponse(
            UUID userId,
            UUID attendanceId,
            String fullName,
            String playerHandle,
            String primaryPositionCode,
            String secondaryPositionCode,
            boolean isPrimary
    ) {
    }

    public record ManualPairRequest(
            UUID playerAId,
            UUID playerBId,
            UUID attendanceAId,
            UUID attendanceBId,
            @NotBlank String positionCode
    ) {
    }
}