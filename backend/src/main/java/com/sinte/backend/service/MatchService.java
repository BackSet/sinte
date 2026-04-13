package com.sinte.backend.service;

import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.MatchSeries;
import com.sinte.backend.domain.MatchSeriesRule;
import com.sinte.backend.domain.MatchSeriesTargetGroup;
import com.sinte.backend.domain.MatchTeam;
import com.sinte.backend.domain.MatchTeamPlayer;
import com.sinte.backend.domain.MatchTargetGroup;
import com.sinte.backend.domain.SinteGroup;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.enums.AttendanceStatus;
import com.sinte.backend.domain.enums.MatchStatus;
import com.sinte.backend.domain.enums.MatchSourceType;
import com.sinte.backend.domain.enums.NotificationType;
import com.sinte.backend.domain.enums.RecurrenceType;
import com.sinte.backend.domain.enums.RoleCode;
import com.sinte.backend.repository.MatchRepository;
import com.sinte.backend.repository.MatchAttendanceRepository;
import com.sinte.backend.repository.MatchSeriesTargetGroupRepository;
import com.sinte.backend.repository.MatchSeriesRepository;
import com.sinte.backend.repository.MatchSeriesRuleRepository;
import com.sinte.backend.repository.MatchTeamPlayerRepository;
import com.sinte.backend.repository.MatchTeamRepository;
import com.sinte.backend.repository.MatchTargetGroupRepository;
import com.sinte.backend.repository.SinteGroupRepository;
import com.sinte.backend.repository.UserRepository;
import com.sinte.backend.repository.UserRoleRepository;
import com.sinte.backend.service.dto.CreateMatchRequest;
import com.sinte.backend.service.dto.CreateMatchSeriesRequest;
import com.sinte.backend.service.dto.SeriesRuleRequest;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchService {

    private final MatchRepository matchRepository;
    private final MatchSeriesRepository matchSeriesRepository;
    private final MatchSeriesRuleRepository matchSeriesRuleRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final MatchTargetGroupRepository matchTargetGroupRepository;
    private final MatchSeriesTargetGroupRepository matchSeriesTargetGroupRepository;
    private final MatchAttendanceRepository matchAttendanceRepository;
    private final MatchTeamRepository matchTeamRepository;
    private final MatchTeamPlayerRepository matchTeamPlayerRepository;
    private final SinteGroupRepository sinteGroupRepository;
    private final AttendanceService attendanceService;
    private final NotificationService notificationService;
    private final GroupService groupService;

    public MatchService(
            MatchRepository matchRepository,
            MatchSeriesRepository matchSeriesRepository,
            MatchSeriesRuleRepository matchSeriesRuleRepository,
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            MatchTargetGroupRepository matchTargetGroupRepository,
            MatchSeriesTargetGroupRepository matchSeriesTargetGroupRepository,
            MatchAttendanceRepository matchAttendanceRepository,
            MatchTeamRepository matchTeamRepository,
            MatchTeamPlayerRepository matchTeamPlayerRepository,
            SinteGroupRepository sinteGroupRepository,
            AttendanceService attendanceService,
            NotificationService notificationService,
            GroupService groupService
    ) {
        this.matchRepository = matchRepository;
        this.matchSeriesRepository = matchSeriesRepository;
        this.matchSeriesRuleRepository = matchSeriesRuleRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.matchTargetGroupRepository = matchTargetGroupRepository;
        this.matchSeriesTargetGroupRepository = matchSeriesTargetGroupRepository;
        this.matchAttendanceRepository = matchAttendanceRepository;
        this.matchTeamRepository = matchTeamRepository;
        this.matchTeamPlayerRepository = matchTeamPlayerRepository;
        this.sinteGroupRepository = sinteGroupRepository;
        this.attendanceService = attendanceService;
        this.notificationService = notificationService;
        this.groupService = groupService;
    }

    @Transactional
    public Match createManualMatch(CreateMatchRequest request) {
        User creator = requireDtOrAdminUser(request.createdByUserId());
        validateMatchTimeRange(request.startsAt(), request.endsAt());
        List<SinteGroup> targetGroups = groupService.validateTargetGroupsForRequester(
                creator.getId(),
                request.targetGroupIds()
        );

        Match match = new Match(
                creator,
                request.title(),
                request.description(),
                request.location(),
                request.startsAt(),
                request.endsAt(),
                MatchSourceType.MANUAL,
                null
        );
        match.configureAttendance(null, true);
        Match saved = matchRepository.save(match);
        saveMatchTargetGroups(saved, targetGroups);
        createAttendanceAndNotifyPlayers(saved, targetGroups.stream().map(SinteGroup::getId).toList());
        return saved;
    }

    @Transactional
    public MatchSeries createSeries(CreateMatchSeriesRequest request) {
        User creator = requireDtOrAdminUser(request.createdByUserId());
        if (request.rules() == null || request.rules().isEmpty()) {
            throw new DomainException("Una serie debe incluir al menos una regla de recurrencia");
        }
        List<SinteGroup> targetGroups = groupService.validateTargetGroupsForRequester(
                creator.getId(),
                request.targetGroupIds()
        );

        MatchSeries series = new MatchSeries(
                creator,
                request.name(),
                request.startDate(),
                request.endDate(),
                request.timezone(),
                request.location(),
                request.targetPlayers()
        );
        MatchSeries savedSeries = matchSeriesRepository.save(series);

        List<MatchSeriesRule> rules = request.rules().stream()
                .peek(this::validateSeriesRule)
                .map(rule -> toSeriesRule(savedSeries, rule))
                .toList();
        matchSeriesRuleRepository.saveAll(rules);
        saveSeriesTargetGroups(savedSeries, targetGroups);
        return savedSeries;
    }

    @Transactional
    public List<Match> generateMatchesFromSeries(UUID seriesId, LocalDate from, LocalDate to) {
        MatchSeries series = matchSeriesRepository.findById(seriesId)
                .orElseThrow(() -> new DomainException("Serie no encontrada"));

        if (!series.isActive()) {
            throw new DomainException("La serie esta inactiva");
        }
        return generateMatchesForSeries(series, from, to);
    }

    @Transactional
    public int generateMatchesForActiveSeries(LocalDate from, LocalDate to) {
        int generatedCount = 0;
        List<MatchSeries> activeSeries = matchSeriesRepository.findByActiveTrue();
        for (MatchSeries series : activeSeries) {
            generatedCount += generateMatchesForSeries(series, from, to).size();
        }
        return generatedCount;
    }

    private List<Match> generateMatchesForSeries(MatchSeries series, LocalDate from, LocalDate to) {
        ZoneId zoneId = ZoneId.of(series.getTimezone());
        List<MatchSeriesRule> rules = matchSeriesRuleRepository.findBySeriesId(series.getId());
        List<UUID> targetGroupIds = matchSeriesTargetGroupRepository.findGroupIdsBySeriesId(series.getId());
        if (rules.isEmpty()) {
            return List.of();
        }

        LocalDate effectiveStart = maxDate(from, series.getStartDate());
        LocalDate effectiveEnd = minDate(to, series.getEndDate() != null ? series.getEndDate() : to);

        if (effectiveEnd.isBefore(effectiveStart)) {
            return List.of();
        }

        List<Match> generated = new ArrayList<>();
        for (LocalDate date = effectiveStart; !date.isAfter(effectiveEnd); date = date.plusDays(1)) {
            for (MatchSeriesRule rule : rules) {
                if (!matchesRuleDate(series, rule, date)) {
                    continue;
                }
                ZonedDateTime startZdt = ZonedDateTime.of(date, rule.getStartTime(), zoneId);
                OffsetDateTime startsAt = startZdt.toOffsetDateTime();

                if (matchRepository.existsBySeriesIdAndStartsAt(series.getId(), startsAt)) {
                    continue;
                }

                Match match = new Match(
                        series.getCreatedBy(),
                        "Partido " + date,
                        "Generado automaticamente por serie",
                        series.getLocation(),
                        startsAt,
                        null,
                        MatchSourceType.SERIES,
                        series
                );
                match.configureAttendance(series.getTargetPlayers(), true);
                Match saved = matchRepository.save(match);
                createMatchTargetGroupsFromIds(saved, targetGroupIds);
                createAttendanceAndNotifyPlayers(saved, targetGroupIds);
                generated.add(saved);
            }
        }
        return generated;
    }

    private boolean matchesRuleDate(MatchSeries series, MatchSeriesRule rule, LocalDate date) {
        if (rule.getRecurrenceType() == RecurrenceType.WEEKLY) {
            return rule.getDayOfWeek() != null && date.getDayOfWeek().getValue() == rule.getDayOfWeek();
        }

        if (rule.getRecurrenceType() == RecurrenceType.EVERY_N_DAYS) {
            if (rule.getIntervalDays() == null || rule.getIntervalDays() <= 0) {
                return false;
            }
            long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(series.getStartDate(), date);
            return daysBetween >= 0 && daysBetween % rule.getIntervalDays() == 0;
        }

        if (rule.getRecurrenceType() == RecurrenceType.MONTHLY_DAY_OF_MONTH) {
            if (rule.getDayOfMonth() == null) {
                return false;
            }
            return date.getDayOfMonth() == rule.getDayOfMonth();
        }

        return false;
    }

    @Transactional(readOnly = true)
    public List<Match> listMatches(OffsetDateTime from, OffsetDateTime to, MatchStatus status) {
        if (from != null && to != null) {
            if (status != null) {
                return matchRepository.findByStartsAtBetweenAndStatusOrderByStartsAtAsc(from, to, status);
            }
            return matchRepository.findByStartsAtBetweenOrderByStartsAtAsc(from, to);
        }
        return matchRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Match> listMatchesForUser(UUID userId, OffsetDateTime from, OffsetDateTime to, MatchStatus status) {
        boolean isDt = userRoleRepository.existsByUserIdAndRoleCode(userId, RoleCode.DT);
        boolean isAdmin = userRoleRepository.existsByUserIdAndRoleCode(userId, RoleCode.ADMIN);
        if (isDt || isAdmin) {
            return listMatches(from, to, status);
        }
        return matchRepository.findUserMatches(userId, from, to, status);
    }

    @Transactional
    public Match updateManualMatch(UUID matchId, CreateMatchRequest request) {
        User creator = requireDtOrAdminUser(request.createdByUserId());
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new DomainException("Partido no encontrado"));

        if (!creator.getId().equals(match.getCreatedBy().getId()) && !isAdmin(creator.getId())) {
            throw new DomainException("No tienes permisos para editar este partido");
        }
        validateMatchTimeRange(request.startsAt(), request.endsAt());
        List<SinteGroup> targetGroups = groupService.validateTargetGroupsForRequester(
                creator.getId(),
                request.targetGroupIds()
        );
        match.update(request.title(), request.description(), request.location(), request.startsAt(), request.endsAt());
        Match saved = matchRepository.save(match);
        matchTargetGroupRepository.deleteByMatchId(saved.getId());
        saveMatchTargetGroups(saved, targetGroups);
        return saved;
    }

    @Transactional
    public void cancelMatch(UUID matchId, UUID requesterUserId) {
        User requester = requireDtOrAdminUser(requesterUserId);
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new DomainException("Partido no encontrado"));

        if (!requester.getId().equals(match.getCreatedBy().getId()) && !isAdmin(requester.getId())) {
            throw new DomainException("No tienes permisos para cancelar este partido");
        }
        match.updateStatus(MatchStatus.CANCELLED);
        matchRepository.save(match);
    }

    @Transactional(readOnly = true)
    public List<MatchSeries> listSeries() {
        return matchSeriesRepository.findAll();
    }

    @Transactional
    public void deactivateSeries(UUID seriesId, UUID requesterUserId) {
        User requester = requireDtOrAdminUser(requesterUserId);
        MatchSeries series = matchSeriesRepository.findById(seriesId)
                .orElseThrow(() -> new DomainException("Serie no encontrada"));

        if (!requester.getId().equals(series.getCreatedBy().getId()) && !isAdmin(requester.getId())) {
            throw new DomainException("No tienes permisos para desactivar esta serie");
        }
        series.deactivate();
        matchSeriesRepository.save(series);
    }

    private MatchSeriesRule toSeriesRule(MatchSeries series, SeriesRuleRequest ruleRequest) {
        return new MatchSeriesRule(
                series,
                ruleRequest.recurrenceType(),
                ruleRequest.dayOfWeek() != null ? (short) ruleRequest.dayOfWeek().getValue() : null,
                ruleRequest.intervalDays(),
                ruleRequest.dayOfMonth() != null ? ruleRequest.dayOfMonth().shortValue() : null,
                ruleRequest.startTime()
        );
    }

    private void validateSeriesRule(SeriesRuleRequest rule) {
        if (rule.recurrenceType() == null) {
            throw new DomainException("El tipo de recurrencia es obligatorio");
        }
        if (rule.startTime() == null) {
            throw new DomainException("La regla de serie debe tener hora de inicio valida");
        }

        if (rule.recurrenceType() == RecurrenceType.WEEKLY) {
            if (rule.dayOfWeek() == null) {
                throw new DomainException("Para recurrencia semanal debes indicar el dia de semana");
            }
            return;
        }

        if (rule.recurrenceType() == RecurrenceType.EVERY_N_DAYS) {
            if (rule.intervalDays() == null || rule.intervalDays() <= 0) {
                throw new DomainException("Para recurrencia cada N dias debes indicar interval_days > 0");
            }
            return;
        }

        if (rule.recurrenceType() == RecurrenceType.MONTHLY_DAY_OF_MONTH
                && (rule.dayOfMonth() == null || rule.dayOfMonth() < 1 || rule.dayOfMonth() > 31)) {
            throw new DomainException("Para recurrencia mensual debes indicar un dia del mes entre 1 y 31");
        }
    }

    private void createAttendanceAndNotifyPlayers(Match match, List<UUID> targetGroupIds) {
        List<User> players;
        if (targetGroupIds == null || targetGroupIds.isEmpty()) {
            players = userRoleRepository.findActiveUsersByRoleCode(RoleCode.PLAYER);
        } else {
            players = groupService.resolvePlayersForGroupIds(targetGroupIds);
        }
        attendanceService.initializePendingAttendance(match, players);

        String title = "Nuevo partido creado";
        String body = "Hay un partido programado para " + match.getStartsAt() + ". Confirma asistencia en el sistema.";
        for (User player : players) {
            notificationService.notifyUser(player.getId(), NotificationType.MATCH_CREATED, title, body);
        }
    }

    @Transactional(readOnly = true)
    public List<UUID> getTargetGroupIds(UUID matchId) {
        return matchTargetGroupRepository.findGroupIdsByMatchId(matchId);
    }

    @Transactional(readOnly = true)
    public List<GroupSummary> getTargetGroups(UUID matchId) {
        return toGroupSummaries(matchTargetGroupRepository.findGroupIdsByMatchId(matchId));
    }

    @Transactional(readOnly = true)
    public List<UUID> getSeriesTargetGroupIds(UUID seriesId) {
        return matchSeriesTargetGroupRepository.findGroupIdsBySeriesId(seriesId);
    }

    @Transactional(readOnly = true)
    public List<GroupSummary> getSeriesTargetGroups(UUID seriesId) {
        return toGroupSummaries(matchSeriesTargetGroupRepository.findGroupIdsBySeriesId(seriesId));
    }

    @Transactional(readOnly = true)
    public AttendanceSummary getAttendanceSummary(UUID matchId) {
        long confirmedCount = matchAttendanceRepository.countByMatchIdAndStatus(
                matchId,
                AttendanceStatus.YES
        );
        long pendingCount = matchAttendanceRepository.countByMatchIdAndStatus(
                matchId,
                AttendanceStatus.PENDING
        );
        return new AttendanceSummary(confirmedCount, pendingCount);
    }

    @Transactional(readOnly = true)
    public List<ConfirmedPlayer> listConfirmedPlayers(UUID requesterUserId, UUID matchId) {
        ensureCanAccessMatch(requesterUserId, matchId);
        return matchAttendanceRepository.findByMatchIdAndStatusOrderByRespondedAtAsc(matchId, AttendanceStatus.YES).stream()
                .map(attendance -> new ConfirmedPlayer(
                        attendance.getUser().getId(),
                        attendance.getUser().getFullName(),
                        attendance.getUser().getEmail(),
                        attendance.getUser().getPlayerHandle(),
                        attendance.getUser().getPrimaryPosition() != null ? attendance.getUser().getPrimaryPosition().name() : null
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TeamView> getTeams(UUID requesterUserId, UUID matchId) {
        ensureCanAccessMatch(requesterUserId, matchId);
        List<MatchTeam> teams = matchTeamRepository.findByMatchIdOrderByTeamNumberAsc(matchId);
        List<MatchTeamPlayer> players = matchTeamPlayerRepository.findByMatchId(matchId);
        return toTeamViews(teams, players);
    }

    @Transactional(readOnly = true)
    public List<TeamView> suggestTeams(UUID requesterUserId, UUID matchId, int teamSize) {
        ensureCanManageMatch(requesterUserId, matchId);
        if (teamSize <= 0) {
            throw new DomainException("El tamano de equipo debe ser mayor a 0");
        }

        List<User> confirmedUsers = matchAttendanceRepository.findByMatchIdAndStatusOrderByRespondedAtAsc(matchId, AttendanceStatus.YES).stream()
                .map(attendance -> attendance.getUser())
                .sorted((left, right) -> left.getFullName().compareToIgnoreCase(right.getFullName()))
                .toList();
        if (confirmedUsers.isEmpty()) {
            return List.of();
        }

        int teamCount = (int) Math.ceil((double) confirmedUsers.size() / teamSize);
        List<TeamViewBuilder> builders = new ArrayList<>();
        for (int index = 0; index < teamCount; index++) {
            builders.add(new TeamViewBuilder(index + 1, "Equipo " + (index + 1)));
        }
        int currentTeam = 0;
        for (User user : confirmedUsers) {
            TeamViewBuilder builder = builders.get(currentTeam);
            builder.players.add(new TeamPlayerView(
                    user.getId(),
                    user.getFullName(),
                    user.getPlayerHandle(),
                    user.getPrimaryPosition() != null ? user.getPrimaryPosition().name() : null
            ));
            currentTeam = (currentTeam + 1) % teamCount;
        }
        return builders.stream().map(TeamViewBuilder::build).toList();
    }

    @Transactional
    public List<TeamView> saveTeams(UUID requesterUserId, UUID matchId, List<TeamAssignment> assignments) {
        ensureCanManageMatch(requesterUserId, matchId);
        if (assignments == null || assignments.isEmpty()) {
            throw new DomainException("Debes enviar al menos un equipo");
        }

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new DomainException("Partido no encontrado"));
        List<UUID> confirmedIds = matchAttendanceRepository.findByMatchIdAndStatusOrderByRespondedAtAsc(matchId, AttendanceStatus.YES)
                .stream()
                .map(attendance -> attendance.getUser().getId())
                .toList();

        matchTeamPlayerRepository.deleteByMatchId(matchId);
        matchTeamRepository.deleteByMatchId(matchId);

        List<MatchTeam> savedTeams = new ArrayList<>();
        List<MatchTeamPlayer> savedPlayers = new ArrayList<>();
        for (TeamAssignment assignment : assignments) {
            if (assignment.teamNumber() == null || assignment.teamNumber() <= 0) {
                throw new DomainException("Numero de equipo invalido");
            }
            String name = assignment.name() == null || assignment.name().isBlank()
                    ? "Equipo " + assignment.teamNumber()
                    : assignment.name().trim();
            MatchTeam team = matchTeamRepository.save(new MatchTeam(match, assignment.teamNumber(), name));
            savedTeams.add(team);

            for (UUID playerId : assignment.playerIds()) {
                if (!confirmedIds.contains(playerId)) {
                    throw new DomainException("Solo se pueden asignar jugadores confirmados");
                }
                User user = userRepository.findById(playerId)
                        .orElseThrow(() -> new DomainException("Jugador no encontrado"));
                savedPlayers.add(new MatchTeamPlayer(team, user));
            }
        }
        matchTeamPlayerRepository.saveAll(savedPlayers);
        return toTeamViews(savedTeams, savedPlayers);
    }

    private void saveMatchTargetGroups(Match match, List<SinteGroup> groups) {
        if (groups == null || groups.isEmpty()) {
            return;
        }
        List<MatchTargetGroup> targetGroups = groups.stream()
                .map(group -> new MatchTargetGroup(match, group))
                .toList();
        matchTargetGroupRepository.saveAll(targetGroups);
    }

    private void createMatchTargetGroupsFromIds(Match match, List<UUID> groupIds) {
        if (groupIds == null || groupIds.isEmpty()) {
            return;
        }
        List<SinteGroup> groups = groupService.validateTargetGroupsForRequester(match.getCreatedBy().getId(), groupIds);
        saveMatchTargetGroups(match, groups);
    }

    private void saveSeriesTargetGroups(MatchSeries series, List<SinteGroup> groups) {
        if (groups == null || groups.isEmpty()) {
            return;
        }
        List<MatchSeriesTargetGroup> targetGroups = groups.stream()
                .map(group -> new MatchSeriesTargetGroup(series, group))
                .toList();
        matchSeriesTargetGroupRepository.saveAll(targetGroups);
    }

    private User requireDtOrAdminUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new DomainException("Usuario creador no encontrado"));
        boolean isDt = userRoleRepository.existsByUserIdAndRoleCode(userId, RoleCode.DT);
        boolean isAdmin = userRoleRepository.existsByUserIdAndRoleCode(userId, RoleCode.ADMIN);
        if (!isDt && !isAdmin) {
            throw new DomainException("Solo usuarios DT o ADMIN pueden crear/gestionar partidos o series");
        }
        return user;
    }

    private void validateMatchTimeRange(OffsetDateTime startsAt, OffsetDateTime endsAt) {
        if (startsAt == null || endsAt == null || !endsAt.isAfter(startsAt)) {
            throw new DomainException("El rango de fecha/hora del partido es invalido");
        }
    }

    private LocalDate maxDate(LocalDate left, LocalDate right) {
        return left.isAfter(right) ? left : right;
    }

    private LocalDate minDate(LocalDate left, LocalDate right) {
        return left.isBefore(right) ? left : right;
    }

    private boolean isAdmin(UUID userId) {
        return userRoleRepository.existsByUserIdAndRoleCode(userId, RoleCode.ADMIN);
    }

    private boolean isDt(UUID userId) {
        return userRoleRepository.existsByUserIdAndRoleCode(userId, RoleCode.DT);
    }

    private void ensureCanManageMatch(UUID requesterUserId, UUID matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new DomainException("Partido no encontrado"));
        boolean admin = isAdmin(requesterUserId);
        boolean dt = isDt(requesterUserId);
        if ((!admin && !dt) || (!admin && !match.getCreatedBy().getId().equals(requesterUserId))) {
            throw new DomainException("No tienes permisos para gestionar este partido");
        }
    }

    private void ensureCanAccessMatch(UUID requesterUserId, UUID matchId) {
        boolean admin = isAdmin(requesterUserId);
        boolean dt = isDt(requesterUserId);
        if (admin || dt || matchAttendanceRepository.existsByMatchIdAndUserId(matchId, requesterUserId)) {
            return;
        }
        throw new DomainException("No tienes permisos para ver este partido");
    }

    private List<TeamView> toTeamViews(List<MatchTeam> teams, List<MatchTeamPlayer> players) {
        return teams.stream()
                .map(team -> new TeamView(
                        team.getTeamNumber(),
                        team.getName(),
                        players.stream()
                                .filter(player -> player.getTeam().getId().equals(team.getId()))
                                .map(player -> new TeamPlayerView(
                                        player.getUser().getId(),
                                        player.getUser().getFullName(),
                                        player.getUser().getPlayerHandle(),
                                        player.getUser().getPrimaryPosition() != null ? player.getUser().getPrimaryPosition().name() : null
                                ))
                                .toList()
                ))
                .toList();
    }

    private List<GroupSummary> toGroupSummaries(List<UUID> groupIds) {
        if (groupIds == null || groupIds.isEmpty()) {
            return List.of();
        }
        return sinteGroupRepository.findAllById(groupIds).stream()
                .map(group -> new GroupSummary(group.getId(), group.getName()))
                .sorted((left, right) -> left.name().compareToIgnoreCase(right.name()))
                .toList();
    }

    public record AttendanceSummary(long confirmedCount, long pendingCount) {
    }

    public record ConfirmedPlayer(
            UUID userId,
            String fullName,
            String email,
            String playerHandle,
            String primaryPosition
    ) {
    }

    public record TeamPlayerView(
            UUID userId,
            String fullName,
            String playerHandle,
            String primaryPosition
    ) {
    }

    public record TeamView(
            Integer teamNumber,
            String name,
            List<TeamPlayerView> players
    ) {
    }

    public record TeamAssignment(
            Integer teamNumber,
            String name,
            List<UUID> playerIds
    ) {
    }

    public record GroupSummary(
            UUID id,
            String name
    ) {
    }

    @Transactional(readOnly = true)
    public Match getMatch(UUID matchId) {
        return matchRepository.findById(matchId)
                .orElseThrow(() -> new DomainException("Partido no encontrado"));
    }

    private static class TeamViewBuilder {
        private final Integer teamNumber;
        private final String name;
        private final List<TeamPlayerView> players = new ArrayList<>();

        private TeamViewBuilder(Integer teamNumber, String name) {
            this.teamNumber = teamNumber;
            this.name = name;
        }

        private TeamView build() {
            return new TeamView(teamNumber, name, players);
        }
    }
}
