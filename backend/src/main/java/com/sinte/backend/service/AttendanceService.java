package com.sinte.backend.service;

import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.MatchAttendance;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.enums.AttendanceStatus;
import com.sinte.backend.domain.enums.MatchStatus;
import com.sinte.backend.repository.MatchAttendanceRepository;
import com.sinte.backend.repository.UserRoleRepository;
import com.sinte.backend.domain.enums.RoleCode;
import com.sinte.backend.service.dto.AttendanceResponseRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AttendanceService {

    private final MatchAttendanceRepository matchAttendanceRepository;
    private final UserRoleRepository userRoleRepository;

    public AttendanceService(MatchAttendanceRepository matchAttendanceRepository, UserRoleRepository userRoleRepository) {
        this.matchAttendanceRepository = matchAttendanceRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @Transactional
    public void initializePendingAttendance(Match match, List<User> players) {
        for (User player : players) {
            boolean exists = matchAttendanceRepository.findByMatchIdAndUserId(match.getId(), player.getId()).isPresent();
            if (!exists) {
                matchAttendanceRepository.save(new MatchAttendance(match, player));
            }
        }
    }

    @Transactional
    public MatchAttendance respondAttendance(AttendanceResponseRequest request) {
        if (request.status() == AttendanceStatus.PENDING) {
            throw new DomainException("La respuesta de asistencia no puede ser PENDING");
        }

        MatchAttendance attendance = matchAttendanceRepository
                .findByMatchIdAndUserId(request.matchId(), request.userId())
                .orElseThrow(() -> new DomainException("No existe registro de asistencia para el usuario/partido"));

        if (attendance.getMatch().getStatus() == MatchStatus.FINISHED) {
            throw new DomainException("No se puede responder asistencia de un partido finalizado");
        }

        if (!attendance.getMatch().isAttendanceOpen()) {
            throw new DomainException("La asistencia de este partido esta cerrada");
        }

        attendance.respond(request.status(), request.comment());
        return matchAttendanceRepository.save(attendance);
    }

    @Transactional
    public MatchAttendance unconfirmAttendance(UUID matchId, UUID userId) {
        MatchAttendance attendance = matchAttendanceRepository
                .findByMatchIdAndUserId(matchId, userId)
                .orElseThrow(() -> new DomainException("No existe registro de asistencia para el usuario/partido"));

        if (attendance.getMatch().getStatus() == MatchStatus.FINISHED) {
            throw new DomainException("No se puede desconfirmar asistencia de un partido finalizado");
        }

        attendance.resetToPending();
        return matchAttendanceRepository.save(attendance);
    }

    @Transactional(readOnly = true)
    public List<MatchAttendance> getAttendanceByMatch(UUID matchId, UUID requesterUserId) {
        ensureCanAccessMatch(requesterUserId, matchId);
        return matchAttendanceRepository.findByMatchIdOrderByStatusAsc(matchId);
    }

    private void ensureCanAccessMatch(UUID requesterUserId, UUID matchId) {
        boolean isAdmin = userRoleRepository.existsByUserIdAndRoleCode(requesterUserId, RoleCode.ADMIN);
        boolean isDt = userRoleRepository.existsByUserIdAndRoleCode(requesterUserId, RoleCode.DT);
        boolean isCalledPlayer = matchAttendanceRepository.existsByMatchIdAndUserId(matchId, requesterUserId);
        if (isAdmin || isDt || isCalledPlayer) {
            return;
        }
        throw new DomainException("No tienes permisos para ver asistencias de este partido");
    }
}
