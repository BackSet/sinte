package com.sinte.backend.service;

import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.MatchAttendance;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.enums.AttendanceStatus;
import com.sinte.backend.repository.MatchAttendanceRepository;
import com.sinte.backend.repository.MatchRepository;
import com.sinte.backend.service.dto.AttendanceResponseRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AttendanceService {

    private final MatchAttendanceRepository matchAttendanceRepository;
    private final MatchRepository matchRepository;

    public AttendanceService(MatchAttendanceRepository matchAttendanceRepository, MatchRepository matchRepository) {
        this.matchAttendanceRepository = matchAttendanceRepository;
        this.matchRepository = matchRepository;
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

        if (!attendance.getMatch().isAttendanceOpen()) {
            throw new DomainException("La asistencia de este partido esta cerrada");
        }

        attendance.respond(request.status(), request.comment());
        MatchAttendance saved = matchAttendanceRepository.save(attendance);
        recalculateAttendanceState(saved.getMatch());
        return saved;
    }

    @Transactional
    public MatchAttendance unconfirmAttendance(UUID matchId, UUID userId) {
        MatchAttendance attendance = matchAttendanceRepository
                .findByMatchIdAndUserId(matchId, userId)
                .orElseThrow(() -> new DomainException("No existe registro de asistencia para el usuario/partido"));
        attendance.resetToPending();
        MatchAttendance saved = matchAttendanceRepository.save(attendance);
        recalculateAttendanceState(saved.getMatch());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<MatchAttendance> getAttendanceByMatch(UUID matchId) {
        return matchAttendanceRepository.findByMatchIdOrderByStatusAsc(matchId);
    }

    private void recalculateAttendanceState(Match match) {
        Integer targetPlayers = match.getTargetPlayers();
        if (targetPlayers == null || targetPlayers <= 0) {
            return;
        }
        long confirmedYes = matchAttendanceRepository.countByMatchIdAndStatus(match.getId(), AttendanceStatus.YES);
        boolean shouldBeOpen = confirmedYes < targetPlayers;
        if (match.isAttendanceOpen() != shouldBeOpen) {
            match.updateAttendanceOpen(shouldBeOpen);
            matchRepository.save(match);
        }
    }
}
