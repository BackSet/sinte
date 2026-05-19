package com.sinte.backend.service;

import com.sinte.backend.domain.Attendance;
import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.enums.AttendanceStatus;
import com.sinte.backend.domain.enums.MatchStatus;
import com.sinte.backend.repository.AttendanceRepository;
import com.sinte.backend.repository.UserRoleRepository;
import com.sinte.backend.domain.enums.RoleCode;
import com.sinte.backend.service.dto.AttendanceResponseRequest;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final UserRoleRepository userRoleRepository;

    public AttendanceService(AttendanceRepository attendanceRepository, UserRoleRepository userRoleRepository) {
        this.attendanceRepository = attendanceRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @Transactional
    public void initializePendingAttendance(Match match, List<User> players) {
        for (User player : players) {
            boolean exists = attendanceRepository.existsByMatchIdAndUserId(match.getId(), player.getId());
            if (!exists) {
                attendanceRepository.save(new Attendance(match, player));
            }
        }
    }

    @Transactional
    public Attendance respondAttendance(AttendanceResponseRequest request) {
        if (request.status() == AttendanceStatus.PENDING) {
            throw new DomainException("La respuesta de asistencia no puede ser PENDING");
        }

        Attendance attendance = attendanceRepository
                .findByMatchIdAndUserId(request.matchId(), request.userId())
                .orElseThrow(() -> new DomainException("No existe registro de asistencia para el usuario/partido"));

        if (attendance.getMatch().getStatus() == MatchStatus.FINISHED) {
            throw new DomainException("No se puede responder asistencia de un partido finalizado");
        }

        if (attendance.getMatch().getStartsAt().isBefore(OffsetDateTime.now())) {
            throw new DomainException("No se puede responder asistencia de un partido que ya paso");
        }

        if (!attendance.getMatch().isAttendanceOpen()) {
            throw new DomainException("La asistencia de este partido esta cerrada");
        }

        attendance.respond(request.status());
        return attendanceRepository.save(attendance);
    }

    @Transactional
    public Attendance unconfirmAttendance(UUID matchId, UUID userId) {
        Attendance attendance = attendanceRepository
                .findByMatchIdAndUserId(matchId, userId)
                .orElseThrow(() -> new DomainException("No existe registro de asistencia para el usuario/partido"));

        if (attendance.getMatch().getStatus() == MatchStatus.FINISHED) {
            throw new DomainException("No se puede desconfirmar asistencia de un partido finalizado");
        }

        if (attendance.getMatch().getStartsAt().isBefore(OffsetDateTime.now())) {
            throw new DomainException("No se puede desconfirmar asistencia de un partido que ya paso");
        }

        attendance.resetToPending();
        return attendanceRepository.save(attendance);
    }

    @Transactional(readOnly = true)
    public List<Attendance> getAttendanceByMatch(UUID matchId, UUID requesterUserId) {
        ensureCanAccessMatch(requesterUserId, matchId);
        return attendanceRepository.findByMatchIdOrderByStatusAsc(matchId);
    }

    @Transactional
    public Attendance createExternal(Match match, String externalName, User invitedBy) {
        Attendance attendance = Attendance.external(match, externalName, invitedBy);
        return attendanceRepository.save(attendance);
    }

    @Transactional
    public Attendance updateExternalStatus(UUID attendanceId, AttendanceStatus status) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new DomainException("Asistencia no encontrada"));
        attendance.respond(status);
        return attendanceRepository.save(attendance);
    }

    @Transactional
    public void deleteExternal(UUID attendanceId) {
        if (!attendanceRepository.existsById(attendanceId)) {
            throw new DomainException("Asistencia no encontrada");
        }
        attendanceRepository.deleteById(attendanceId);
    }

    private void ensureCanAccessMatch(UUID requesterUserId, UUID matchId) {
        boolean isAdmin = userRoleRepository.existsByUserIdAndRoleCode(requesterUserId, RoleCode.ADMIN);
        boolean isDt = userRoleRepository.existsByUserIdAndRoleCode(requesterUserId, RoleCode.DT);
        boolean isCalledPlayer = attendanceRepository.existsByMatchIdAndUserId(matchId, requesterUserId);
        if (isAdmin || isDt || isCalledPlayer) {
            return;
        }
        throw new DomainException("No tienes permisos para ver asistencias de este partido");
    }
}
