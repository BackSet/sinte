package com.sinte.backend.service;

import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.MatchAttendance;
import com.sinte.backend.domain.MatchConfig;
import com.sinte.backend.config.SeriesGenerationProperties;
import com.sinte.backend.domain.GuestPlayer;
import com.sinte.backend.domain.GuestPlayerPosition;
import com.sinte.backend.domain.MatchSeries;
import com.sinte.backend.domain.MatchSeriesRule;
import com.sinte.backend.domain.MatchSeriesTargetGroup;
import com.sinte.backend.domain.MatchTeam;
import com.sinte.backend.domain.MatchTeamPlayer;
import com.sinte.backend.domain.MatchTargetGroup;
import com.sinte.backend.domain.SinteGroup;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.UserPosition;
import com.sinte.backend.domain.enums.AttendanceStatus;
import com.sinte.backend.domain.enums.MatchSourceType;
import com.sinte.backend.domain.enums.MatchStatus;
import com.sinte.backend.domain.enums.NotificationType;
import com.sinte.backend.domain.enums.RecurrenceType;
import com.sinte.backend.domain.enums.RoleCode;
import com.sinte.backend.repository.MatchConfigRepository;
import com.sinte.backend.repository.MatchPairRepository;
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
import com.sinte.backend.repository.UserPositionRepository;
import com.sinte.backend.repository.UserRoleRepository;
import com.sinte.backend.repository.GuestPlayerRepository;
import com.sinte.backend.repository.GuestPlayerPositionRepository;
import com.sinte.backend.repository.GuestPlayerPositionRepository;
import com.sinte.backend.service.dto.CreateMatchRequest;
import com.sinte.backend.service.dto.CreateMatchSeriesRequest;
import com.sinte.backend.service.dto.SeriesRuleRequest;
import com.sinte.backend.service.dto.UpdateMatchSeriesRequest;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchService {

    private final MatchRepository matchRepository;
    private final MatchConfigRepository matchConfigRepository;
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
    private final UserPositionRepository userPositionRepository;
    private final GuestPlayerRepository guestPlayerRepository;
    private final GuestPlayerPositionRepository guestPlayerPositionRepository;
    private final MatchPairRepository matchPairRepository;
    private final AttendanceService attendanceService;
    private final NotificationService notificationService;
    private final GroupService groupService;
    private final SeriesGenerationProperties seriesGenerationProperties;

    public MatchService(
            MatchRepository matchRepository,
            MatchConfigRepository matchConfigRepository,
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
            UserPositionRepository userPositionRepository,
            GuestPlayerRepository guestPlayerRepository,
            GuestPlayerPositionRepository guestPlayerPositionRepository,
            MatchPairRepository matchPairRepository,
            AttendanceService attendanceService,
            NotificationService notificationService,
            GroupService groupService,
            SeriesGenerationProperties seriesGenerationProperties
    ) {
        this.matchRepository = matchRepository;
        this.matchConfigRepository = matchConfigRepository;
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
        this.userPositionRepository = userPositionRepository;
        this.guestPlayerRepository = guestPlayerRepository;
        this.guestPlayerPositionRepository = guestPlayerPositionRepository;
        this.matchPairRepository = matchPairRepository;
        this.attendanceService = attendanceService;
        this.notificationService = notificationService;
        this.groupService = groupService;
        this.seriesGenerationProperties = seriesGenerationProperties;
    }

    @Transactional
    public Match createManualMatch(CreateMatchRequest request) {
        User creator = requireDtOrAdminUser(request.createdByUserId());
        if (request.title() == null || request.title().isBlank()) {
            throw new DomainException("El titulo es obligatorio");
        }
        if (request.configId() == null) {
            throw new DomainException("El config es obligatorio");
        }
        if (request.startsAt() == null) {
            throw new DomainException("La fecha/hora de inicio es obligatoria");
        }
        MatchConfig config = matchConfigRepository.findById(request.configId())
                .orElseThrow(() -> new DomainException("Config no encontrado"));
        List<SinteGroup> targetGroups = groupService.validateTargetGroupsForRequester(
                creator.getId(),
                request.targetGroupIds()
        );
        OffsetDateTime endsAt = request.startsAt().plusHours(2);

        Match match = new Match(
                creator,
                request.title().trim(),
                request.description(),
                config.getLocation(),
                request.startsAt(),
                endsAt,
                MatchSourceType.MANUAL,
                null,
                config
        );
        match.snapshotFromConfig();
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
        if (request.configId() == null) {
            throw new DomainException("El config es obligatorio");
        }
        MatchConfig config = matchConfigRepository.findById(request.configId())
                .orElseThrow(() -> new DomainException("Config no encontrado"));
        List<SinteGroup> targetGroups = groupService.validateTargetGroupsForRequester(
                creator.getId(),
                request.targetGroupIds()
        );

        LocalDate today = LocalDate.now(ZoneId.of(request.timezone()));
        MatchSeries series = new MatchSeries(
                creator,
                request.defaultTitle(),
                today,
                null,
                config
        );
        MatchSeries savedSeries = matchSeriesRepository.save(series);

        List<MatchSeriesRule> rules = request.rules().stream()
                .peek(this::validateSeriesRule)
                .map(rule -> toSeriesRule(savedSeries, rule))
                .toList();
        matchSeriesRuleRepository.saveAll(rules);
        saveSeriesTargetGroups(savedSeries, targetGroups);
        LocalDate generationTo = today.plusDays(Math.max(1, seriesGenerationProperties.getHorizonDays()));
        generateMatchesForSeries(savedSeries, today, generationTo);
        return savedSeries;
    }

    @Transactional
    public MatchSeries updateSeries(UUID seriesId, UpdateMatchSeriesRequest request) {
        User requester = requireDtOrAdminUser(request.requesterUserId());
        MatchSeries series = matchSeriesRepository.findById(seriesId)
                .orElseThrow(() -> new DomainException("Serie no encontrada"));

        if (!requester.getId().equals(series.getCreatedBy().getId()) && !isAdmin(requester.getId())) {
            throw new DomainException("No tienes permisos para modificar esta serie");
        }
        if (request.rules() == null || request.rules().isEmpty()) {
            throw new DomainException("Una serie debe incluir al menos una regla de recurrencia");
        }

        List<SinteGroup> targetGroups = groupService.validateTargetGroupsForRequester(
                requester.getId(),
                request.targetGroupIds()
        );

        series.updateMetadata(
                request.defaultTitle()
        );

        if (request.configId() != null) {
            MatchConfig newConfig = matchConfigRepository.findById(request.configId())
                    .orElseThrow(() -> new DomainException("Config no encontrado"));
            series.setConfig(newConfig);
        }

        if (request.active() != null) {
            if (request.active()) {
                series.activate();
            } else if (series.isActive()) {
                series.deactivate(LocalDate.now(ZoneId.of(series.getTimezone())));
            }
        }
        MatchSeries savedSeries = matchSeriesRepository.save(series);

        matchSeriesRuleRepository.deleteBySeriesId(savedSeries.getId());
        matchSeriesRuleRepository.flush();
        List<MatchSeriesRule> rules = request.rules().stream()
                .peek(this::validateSeriesRule)
                .map(rule -> toSeriesRule(savedSeries, rule))
                .toList();
        matchSeriesRuleRepository.saveAll(rules);

        matchSeriesTargetGroupRepository.deleteBySeriesId(savedSeries.getId());
        matchSeriesTargetGroupRepository.flush();
        saveSeriesTargetGroups(savedSeries, targetGroups);

        if (savedSeries.isActive()) {
            cancelFutureSeriesMatches(savedSeries.getId());
            LocalDate today = LocalDate.now(ZoneId.of(savedSeries.getTimezone()));
            LocalDate generationTo = today.plusDays(Math.max(1, seriesGenerationProperties.getHorizonDays()));
            generateMatchesForSeries(savedSeries, today, generationTo);
        }

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
                OffsetDateTime endsAt = startsAt.plusHours(2);

                if (matchRepository.existsBySeriesIdAndStartsAt(series.getId(), startsAt)) {
                    continue;
                }

                Match match = new Match(
                        series.getCreatedBy(),
                        resolveSeriesGeneratedTitle(series, date),
                        "Generado automaticamente por serie",
                        series.getConfig().getLocation(),
                        startsAt,
                        endsAt,
                        MatchSourceType.SERIES,
                        series,
                        series.getConfig()
                );
                match.snapshotFromConfig();
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

    private String resolveSeriesGeneratedTitle(MatchSeries series, LocalDate date) {
        String title = series.getDefaultTitle();
        if (title == null || title.isBlank()) {
            return "Partido " + date;
        }
        return title.trim() + " - " + date;
    }

    @Transactional(readOnly = true)
    public List<Match> listMatches(OffsetDateTime from, OffsetDateTime to, MatchStatus status) {
        if (from != null && to != null) {
            if (status != null) {
                return matchRepository.findByStartsAtBetweenAndStatusOrderByCreatedAtDescStartsAtDesc(from, to, status);
            }
            return matchRepository.findByStartsAtBetweenOrderByCreatedAtDescStartsAtDesc(from, to);
        }
        return matchRepository.findAllByOrderByCreatedAtDescStartsAtDesc();
    }

    @Transactional(readOnly = true)
    public List<Match> listMatchesForUser(UUID userId, OffsetDateTime from, OffsetDateTime to, MatchStatus status) {
        boolean isDt = userRoleRepository.existsByUserIdAndRoleCode(userId, RoleCode.DT);
        boolean isAdmin = userRoleRepository.existsByUserIdAndRoleCode(userId, RoleCode.ADMIN);
        if (isDt || isAdmin) {
            return listMatches(from, to, status);
        }
        if (from == null && to == null) {
            if (status == null) {
                return matchRepository.findUserMatches(userId);
            }
            return matchRepository.findUserMatchesByStatus(userId, status);
        }
        if (status == null) {
            return matchRepository.findUserMatchesByRange(userId, from, to);
        }
        return matchRepository.findUserMatchesByRangeAndStatus(userId, from, to, status);
    }

    @Transactional
    public Match updateManualMatch(UUID matchId, CreateMatchRequest request) {
        User creator = requireDtOrAdminUser(request.createdByUserId());
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new DomainException("Partido no encontrado"));

        if (match.getStatus() == MatchStatus.FINISHED) {
            throw new DomainException("No se puede modificar un partido finalizado");
        }
        if (!creator.getId().equals(match.getCreatedBy().getId()) && !isAdmin(creator.getId())) {
            throw new DomainException("No tienes permisos para editar este partido");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new DomainException("El titulo es obligatorio");
        }
        if (request.configId() == null) {
            throw new DomainException("El config es obligatorio");
        }
        if (request.startsAt() == null) {
            throw new DomainException("La fecha/hora de inicio es obligatoria");
        }
        MatchConfig config = matchConfigRepository.findById(request.configId())
                .orElseThrow(() -> new DomainException("Config no encontrado"));
        List<SinteGroup> targetGroups = groupService.validateTargetGroupsForRequester(
                creator.getId(),
                request.targetGroupIds()
        );
        match.update(
                request.title().trim(),
                request.description(),
                config.getLocation(),
                request.startsAt(),
                request.startsAt().plusHours(2)
        );
        match.setConfig(config);
        match.snapshotFromConfig();
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

        if (match.getStatus() == MatchStatus.FINISHED) {
            throw new DomainException("No se puede cancelar un partido finalizado");
        }
        if (!requester.getId().equals(match.getCreatedBy().getId()) && !isAdmin(requester.getId())) {
            throw new DomainException("No tienes permisos para cancelar este partido");
        }
        match.updateStatus(MatchStatus.CANCELLED);
        matchRepository.save(match);
    }

    @Transactional
    public void deleteMatch(UUID matchId, UUID requesterUserId) {
        boolean isDt = userRoleRepository.existsByUserIdAndRoleCode(requesterUserId, RoleCode.DT);
        boolean isAdmin = userRoleRepository.existsByUserIdAndRoleCode(requesterUserId, RoleCode.ADMIN);
        if (!isDt && !isAdmin) {
            throw new DomainException("Solo DT o ADMIN pueden eliminar partidos");
        }
        if (!matchRepository.existsById(matchId)) {
            throw new DomainException("Partido no encontrado");
        }
        List<UUID> guestIds = guestPlayerRepository.findByMatchIdOrderByRespondedAtAsc(matchId)
                .stream().map(GuestPlayer::getId).toList();
        if (!guestIds.isEmpty()) {
            for (UUID guestId : guestIds) {
                guestPlayerPositionRepository.deleteByGuestPlayerId(guestId);
            }
            guestPlayerPositionRepository.flush();
        }
        matchTeamPlayerRepository.deleteByMatchId(matchId);
        matchTeamPlayerRepository.flush();
        matchTeamRepository.deleteByMatchId(matchId);
        matchTeamRepository.flush();
        matchPairRepository.deleteByMatchId(matchId);
        matchPairRepository.flush();
        matchAttendanceRepository.deleteByMatchId(matchId);
        matchAttendanceRepository.flush();
        matchTargetGroupRepository.deleteByMatchId(matchId);
        matchTargetGroupRepository.flush();
        if (!guestIds.isEmpty()) {
            guestPlayerRepository.deleteByMatchId(matchId);
            guestPlayerRepository.flush();
        }
        matchRepository.deleteById(matchId);
    }

    @Transactional(readOnly = true)
    public List<MatchSeries> listSeries() {
        return matchSeriesRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public void deactivateSeries(UUID seriesId, UUID requesterUserId) {
        User requester = requireDtOrAdminUser(requesterUserId);
        MatchSeries series = matchSeriesRepository.findById(seriesId)
                .orElseThrow(() -> new DomainException("Serie no encontrada"));

        if (!requester.getId().equals(series.getCreatedBy().getId()) && !isAdmin(requester.getId())) {
            throw new DomainException("No tienes permisos para desactivar esta serie");
        }
        series.deactivate(LocalDate.now(ZoneId.of(series.getTimezone())));
        matchSeriesRepository.save(series);

        List<Match> scheduledMatches = matchRepository.findBySeriesIdAndStatus(seriesId, MatchStatus.SCHEDULED);
        for (Match match : scheduledMatches) {
            match.updateStatus(MatchStatus.CANCELLED);
            matchRepository.save(match);
        }
    }

    @Transactional
    public void deleteSeries(UUID seriesId, UUID requesterUserId) {
        boolean isDt = userRoleRepository.existsByUserIdAndRoleCode(requesterUserId, RoleCode.DT);
        boolean isAdmin = userRoleRepository.existsByUserIdAndRoleCode(requesterUserId, RoleCode.ADMIN);
        if (!isDt && !isAdmin) {
            throw new DomainException("Solo DT o ADMIN pueden eliminar series");
        }
        if (!matchSeriesRepository.existsById(seriesId)) {
            throw new DomainException("Serie no encontrada");
        }
        matchRepository.unlinkMatchesBySeriesId(seriesId);
        matchRepository.flush();
        matchSeriesTargetGroupRepository.deleteBySeriesId(seriesId);
        matchSeriesTargetGroupRepository.flush();
        matchSeriesRuleRepository.deleteBySeriesId(seriesId);
        matchSeriesRuleRepository.flush();
        matchSeriesRepository.deleteById(seriesId);
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
                        null,
                        attendance.getUser().getFullName(),
                        attendance.getUser().getEmail(),
                        attendance.getUser().getPlayerHandle()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConfirmedPlayer> listConfirmedGuests(UUID requesterUserId, UUID matchId) {
        ensureCanAccessMatch(requesterUserId, matchId);
        return guestPlayerRepository.findByMatchIdAndStatusOrderByRespondedAtAsc(matchId, "YES").stream()
                .map(guest -> new ConfirmedPlayer(
                        null,
                        guest.getId(),
                        guest.getFullName(),
                        null,
                        null
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public RosterView getRoster(UUID requesterUserId, UUID matchId) {
        ensureCanAccessMatch(requesterUserId, matchId);
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new DomainException("Partido no encontrado"));

        List<MatchAttendance> confirmedAttendances = matchAttendanceRepository
                .findByMatchIdAndStatusOrderByRespondedAtAsc(matchId, AttendanceStatus.YES);
        List<MatchAttendance> cancelledAttendances = matchAttendanceRepository
                .findByMatchIdAndStatusOrderByRespondedAtAsc(matchId, AttendanceStatus.CANCELLED);
        List<GuestPlayer> confirmedGuests = guestPlayerRepository
                .findByMatchIdAndStatusOrderByRespondedAtAsc(matchId, "YES");
        List<GuestPlayer> cancelledGuests = guestPlayerRepository
                .findByMatchIdAndStatusOrderByRespondedAtAsc(matchId, "CANCELLED");

        Map<UUID, String> userPositionMap = new HashMap<>();
        if (!confirmedAttendances.isEmpty()) {
            List<UUID> userIds = confirmedAttendances.stream()
                    .map(a -> a.getUser().getId()).distinct().toList();
            List<UserPosition> positions = userPositionRepository.findByUserIdInOrderByPriority(userIds);
            Map<UUID, List<UserPosition>> byUser = positions.stream()
                    .collect(Collectors.groupingBy(up -> up.getUser().getId()));
            for (UUID uid : userIds) {
                List<UserPosition> ups = byUser.get(uid);
                if (ups != null && !ups.isEmpty()) {
                    userPositionMap.put(uid, ups.get(0).getPositionCode());
                }
            }
        }

        Map<UUID, String> guestPositionMap = new HashMap<>();
        List<GuestPlayer> allGuests = new ArrayList<>(confirmedGuests);
        allGuests.addAll(cancelledGuests);
        if (!allGuests.isEmpty()) {
            List<UUID> guestIds = allGuests.stream().map(GuestPlayer::getId).distinct().toList();
            List<GuestPlayerPosition> gPositions = guestPlayerPositionRepository
                    .findByGuestPlayerIdInOrderByPriority(guestIds);
            Map<UUID, List<GuestPlayerPosition>> byGuest = gPositions.stream()
                    .collect(Collectors.groupingBy(gp -> gp.getGuestPlayer().getId()));
            for (UUID gid : guestIds) {
                List<GuestPlayerPosition> gps = byGuest.get(gid);
                if (gps != null && !gps.isEmpty()) {
                    guestPositionMap.put(gid, gps.get(0).getPositionCode());
                }
            }
        }

        Integer targetPlayers = match.getTargetPlayers();
        int rosterCapacity = targetPlayers != null ? targetPlayers : Integer.MAX_VALUE;

        List<RosterPlayerEntry> roster = new ArrayList<>();
        List<RosterPlayerEntry> waitlist = new ArrayList<>();
        for (int i = 0; i < confirmedAttendances.size(); i++) {
            MatchAttendance a = confirmedAttendances.get(i);
            User u = a.getUser();
            RosterPlayerEntry entry = new RosterPlayerEntry(
                    u.getId(), null, u.getFullName(), u.getEmail(), u.getPlayerHandle(),
                    userPositionMap.getOrDefault(u.getId(), "SIN_POSICION"),
                    a.getRespondedAt()
            );
            if (i < rosterCapacity) {
                roster.add(entry);
            } else {
                waitlist.add(entry);
            }
        }

        for (GuestPlayer g : confirmedGuests) {
            RosterPlayerEntry entry = new RosterPlayerEntry(
                    null, g.getId(), g.getFullName(), null, null,
                    guestPositionMap.getOrDefault(g.getId(), "SIN_POSICION"),
                    g.getRespondedAt()
            );
            if (roster.size() < rosterCapacity) {
                roster.add(entry);
            } else {
                waitlist.add(entry);
            }
        }

        List<RosterPlayerEntry> cancelled = new ArrayList<>();
        for (MatchAttendance a : cancelledAttendances) {
            User u = a.getUser();
            cancelled.add(new RosterPlayerEntry(
                    u.getId(), null, u.getFullName(), u.getEmail(), u.getPlayerHandle(),
                    userPositionMap.getOrDefault(u.getId(), "SIN_POSICION"),
                    a.getRespondedAt()
            ));
        }
        for (GuestPlayer g : cancelledGuests) {
            cancelled.add(new RosterPlayerEntry(
                    null, g.getId(), g.getFullName(), null, null,
                    guestPositionMap.getOrDefault(g.getId(), "SIN_POSICION"),
                    g.getRespondedAt()
            ));
        }

        return new RosterView(roster, waitlist, cancelled);
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
                .toList();

        List<GuestPlayer> confirmedGuests = guestPlayerRepository.findByMatchIdAndStatusOrderByRespondedAtAsc(matchId, "YES");

        List<ParticipantInfo> participants = new ArrayList<>();
        for (User user : confirmedUsers) {
            participants.add(new ParticipantInfo(user.getId(), null, user.getFullName(), user.getPlayerHandle(), null));
        }
        for (GuestPlayer guest : confirmedGuests) {
            participants.add(new ParticipantInfo(null, guest.getId(), guest.getFullName(), null, null));
        }

        if (participants.isEmpty()) {
            return List.of();
        }

        Map<UUID, String> userPositionMap = new HashMap<>();
        if (!confirmedUsers.isEmpty()) {
            List<UserPosition> userPositions = userPositionRepository.findByUserIdInOrderByPriority(
                    confirmedUsers.stream().map(User::getId).toList()
            );
            Map<UUID, List<UserPosition>> byUser = userPositions.stream()
                    .collect(Collectors.groupingBy(up -> up.getUser().getId()));
            for (User user : confirmedUsers) {
                List<UserPosition> ups = byUser.get(user.getId());
                if (ups != null && !ups.isEmpty()) {
                    userPositionMap.put(user.getId(), ups.get(0).getPositionCode());
                }
            }
        }

        Map<UUID, String> guestPositionMap = new HashMap<>();
        if (!confirmedGuests.isEmpty()) {
            List<GuestPlayerPosition> guestPositions = guestPlayerPositionRepository.findByGuestPlayerIdInOrderByPriority(
                    confirmedGuests.stream().map(GuestPlayer::getId).toList()
            );
            Map<UUID, List<GuestPlayerPosition>> byGuest = guestPositions.stream()
                    .collect(Collectors.groupingBy(gp -> gp.getGuestPlayer().getId()));
            for (GuestPlayer guest : confirmedGuests) {
                List<GuestPlayerPosition> gps = byGuest.get(guest.getId());
                if (gps != null && !gps.isEmpty()) {
                    guestPositionMap.put(guest.getId(), gps.get(0).getPositionCode());
                }
            }
        }

        for (ParticipantInfo p : participants) {
            String pos = p.userId != null ? userPositionMap.get(p.userId) : guestPositionMap.get(p.guestPlayerId);
            p.primaryPositionCode = pos != null ? pos : "SIN_POSICION";
        }

        LinkedHashMap<String, List<ParticipantInfo>> byPosition = new LinkedHashMap<>();
        participants.stream()
                .sorted((a, b) -> {
                    String pa = a.primaryPositionCode;
                    String pb = b.primaryPositionCode;
                    return pa.compareTo(pb);
                })
                .forEach(p -> byPosition.computeIfAbsent(p.primaryPositionCode, k -> new ArrayList<>()).add(p));

        List<List<ParticipantInfo>> positionGroups = byPosition.values().stream()
                .sorted((a, b) -> Integer.compare(b.size(), a.size()))
                .toList();

        int teamCount = (int) Math.ceil((double) participants.size() / teamSize);
        List<TeamViewBuilder> builders = new ArrayList<>();
        for (int index = 0; index < teamCount; index++) {
            builders.add(new TeamViewBuilder(index + 1, "Equipo " + (index + 1)));
        }

        for (List<ParticipantInfo> group : positionGroups) {
            int currentTeam = 0;
            for (ParticipantInfo p : group) {
                builders.get(currentTeam).players.add(new TeamPlayerView(
                        p.userId,
                        p.guestPlayerId,
                        p.fullName,
                        p.playerHandle,
                        p.primaryPositionCode
                ));
                currentTeam = (currentTeam + 1) % teamCount;
            }
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
        List<UUID> confirmedUserIds = matchAttendanceRepository.findByMatchIdAndStatusOrderByRespondedAtAsc(matchId, AttendanceStatus.YES)
                .stream()
                .map(attendance -> attendance.getUser().getId())
                .toList();

        List<UUID> confirmedGuestIds = guestPlayerRepository.findByMatchIdAndStatusOrderByRespondedAtAsc(matchId, "YES")
                .stream()
                .map(GuestPlayer::getId)
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

            if (assignment.playerIds() != null) {
                for (UUID playerId : assignment.playerIds()) {
                    if (!confirmedUserIds.contains(playerId)) {
                        throw new DomainException("Solo se pueden asignar jugadores confirmados");
                    }
                    User user = userRepository.findById(playerId)
                            .orElseThrow(() -> new DomainException("Jugador no encontrado"));
                    savedPlayers.add(new MatchTeamPlayer(team, user));
                }
            }

            if (assignment.guestPlayerIds() != null) {
                for (UUID guestId : assignment.guestPlayerIds()) {
                    if (!confirmedGuestIds.contains(guestId)) {
                        throw new DomainException("Solo se pueden asignar invitados confirmados");
                    }
                    GuestPlayer guest = guestPlayerRepository.findById(guestId)
                            .orElseThrow(() -> new DomainException("Invitado no encontrado"));
                    savedPlayers.add(new MatchTeamPlayer(team, guest));
                }
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
        Map<UUID, String> userPositionMap = new HashMap<>();
        Map<UUID, String> guestPositionMap = new HashMap<>();

        List<UUID> userIds = players.stream()
                .filter(p -> p.getUser() != null)
                .map(p -> p.getUser().getId())
                .distinct()
                .toList();
        if (!userIds.isEmpty()) {
            List<UserPosition> userPositions = userPositionRepository.findByUserIdInOrderByPriority(userIds);
            Map<UUID, List<UserPosition>> byUser = userPositions.stream()
                    .collect(Collectors.groupingBy(up -> up.getUser().getId()));
            for (UUID uid : userIds) {
                List<UserPosition> ups = byUser.get(uid);
                if (ups != null && !ups.isEmpty()) {
                    userPositionMap.put(uid, ups.get(0).getPositionCode());
                }
            }
        }

        List<UUID> guestIds = players.stream()
                .filter(MatchTeamPlayer::isGuest)
                .map(p -> p.getGuestPlayer().getId())
                .distinct()
                .toList();
        if (!guestIds.isEmpty()) {
            List<GuestPlayerPosition> guestPositions = guestPlayerPositionRepository.findByGuestPlayerIdInOrderByPriority(guestIds);
            Map<UUID, List<GuestPlayerPosition>> byGuest = guestPositions.stream()
                    .collect(Collectors.groupingBy(gp -> gp.getGuestPlayer().getId()));
            for (UUID gid : guestIds) {
                List<GuestPlayerPosition> gps = byGuest.get(gid);
                if (gps != null && !gps.isEmpty()) {
                    guestPositionMap.put(gid, gps.get(0).getPositionCode());
                }
            }
        }

        return teams.stream()
                .map(team -> new TeamView(
                        team.getTeamNumber(),
                        team.getName(),
                        players.stream()
                                .filter(player -> player.getTeam().getId().equals(team.getId()))
                                .map(player -> {
                                    String position = player.getUser() != null
                                            ? userPositionMap.get(player.getUser().getId())
                                            : (player.getGuestPlayer() != null ? guestPositionMap.get(player.getGuestPlayer().getId()) : null);
                                    return new TeamPlayerView(
                                            player.getUser() != null ? player.getUser().getId() : null,
                                            player.getGuestPlayer() != null ? player.getGuestPlayer().getId() : null,
                                            player.getPlayerName(),
                                            player.getPlayerHandle(),
                                            position != null ? position : "SIN_POSICION"
                                    );
                                })
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

    @Transactional
    public int closeStaleMatches() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Match> stale = matchRepository.findAll().stream()
                .filter(match -> match.getStatus() == MatchStatus.SCHEDULED && match.getStartsAt().isBefore(now))
                .toList();
        for (Match match : stale) {
            match.updateStatus(MatchStatus.FINISHED);
            matchRepository.save(match);
        }
        return stale.size();
    }

    private void cancelFutureSeriesMatches(UUID seriesId) {
        List<Match> scheduledMatches = matchRepository.findBySeriesIdAndStatus(seriesId, MatchStatus.SCHEDULED);
        for (Match match : scheduledMatches) {
            match.updateStatus(MatchStatus.CANCELLED);
            matchRepository.save(match);
        }
    }

    public record AttendanceSummary(long confirmedCount, long pendingCount) {
    }

    public record ConfirmedPlayer(
            UUID userId,
            UUID guestPlayerId,
            String fullName,
            String email,
            String playerHandle
    ) {
    }

    public record TeamPlayerView(
            UUID userId,
            UUID guestPlayerId,
            String fullName,
            String playerHandle,
            String primaryPositionCode
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
            List<UUID> playerIds,
            List<UUID> guestPlayerIds
    ) {
    }

    public record RosterPlayerEntry(
            UUID userId,
            UUID guestPlayerId,
            String fullName,
            String email,
            String playerHandle,
            String primaryPositionCode,
            OffsetDateTime respondedAt
    ) {
    }

    public record RosterView(
            List<RosterPlayerEntry> roster,
            List<RosterPlayerEntry> waitlist,
            List<RosterPlayerEntry> cancelled
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

    private static class ParticipantInfo {
        final UUID userId;
        final UUID guestPlayerId;
        final String fullName;
        final String playerHandle;
        String primaryPositionCode;

        ParticipantInfo(UUID userId, UUID guestPlayerId, String fullName, String playerHandle, String primaryPositionCode) {
            this.userId = userId;
            this.guestPlayerId = guestPlayerId;
            this.fullName = fullName;
            this.playerHandle = playerHandle;
            this.primaryPositionCode = primaryPositionCode;
        }
    }
}