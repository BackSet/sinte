package com.sinte.backend.api.v1.attendance;

import com.sinte.backend.config.security.SecurityUtils;
import com.sinte.backend.domain.MatchAttendance;
import com.sinte.backend.domain.enums.AttendanceStatus;
import com.sinte.backend.repository.MatchAttendanceRepository;
import com.sinte.backend.service.AttendanceService;
import com.sinte.backend.service.dto.AttendanceResponseRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final MatchAttendanceRepository matchAttendanceRepository;

    public AttendanceController(AttendanceService attendanceService, MatchAttendanceRepository matchAttendanceRepository) {
        this.attendanceService = attendanceService;
        this.matchAttendanceRepository = matchAttendanceRepository;
    }

    @GetMapping("/match/{matchId}")
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<List<AttendanceResponse>> byMatch(@PathVariable UUID matchId) {
        List<AttendanceResponse> attendance = attendanceService.getAttendanceByMatch(matchId).stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(attendance);
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('PLAYER','DT','ADMIN')")
    public ResponseEntity<List<AttendanceResponse>> myAttendance() {
        UUID userId = SecurityUtils.currentUserId();
        List<AttendanceResponse> attendance = matchAttendanceRepository.findByUserIdOrderByRespondedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(attendance);
    }

    @PostMapping("/respond")
    @PreAuthorize("hasAnyRole('PLAYER','DT','ADMIN')")
    public ResponseEntity<AttendanceResponse> respond(@Valid @RequestBody AttendanceRespondApiRequest request) {
        UUID userId = SecurityUtils.currentUserId();
        MatchAttendance updated = attendanceService.respondAttendance(
                new AttendanceResponseRequest(request.matchId(), userId, request.status(), request.comment())
        );
        return ResponseEntity.ok(toResponse(updated));
    }

    @PostMapping("/unconfirm")
    @PreAuthorize("hasAnyRole('PLAYER','DT','ADMIN')")
    public ResponseEntity<AttendanceResponse> unconfirm(@Valid @RequestBody AttendanceUnconfirmApiRequest request) {
        UUID userId = SecurityUtils.currentUserId();
        MatchAttendance updated = attendanceService.unconfirmAttendance(request.matchId(), userId);
        return ResponseEntity.ok(toResponse(updated));
    }

    private AttendanceResponse toResponse(MatchAttendance attendance) {
        var match = attendance.getMatch();
        long confirmedYesCount = matchAttendanceRepository.countByMatchIdAndStatus(
                match.getId(),
                AttendanceStatus.YES
        );
        long pendingCount = matchAttendanceRepository.countByMatchIdAndStatus(
                match.getId(),
                AttendanceStatus.PENDING
        );
        return new AttendanceResponse(
                attendance.getId(),
                match.getId(),
                match.getTitle(),
                match.getStartsAt(),
                match.getStatus().name(),
                attendance.getUser().getId(),
                attendance.getStatus().name(),
                attendance.getRespondedAt(),
                attendance.getComment(),
                match.isAttendanceOpen(),
                match.getTargetPlayers(),
                confirmedYesCount,
                pendingCount
        );
    }

    public record AttendanceRespondApiRequest(
            @NotNull UUID matchId,
            @NotNull AttendanceStatus status,
            String comment
    ) {
    }

    public record AttendanceUnconfirmApiRequest(
            @NotNull UUID matchId
    ) {
    }

    public record AttendanceResponse(
            UUID id,
            UUID matchId,
            String matchTitle,
            OffsetDateTime matchStartsAt,
            String matchStatus,
            UUID userId,
            String status,
            OffsetDateTime respondedAt,
            String comment,
            boolean attendanceOpen,
            Integer targetPlayers,
            long confirmedYesCount,
            long pendingCount
    ) {
    }
}
