package com.sinte.backend.repository;

import com.sinte.backend.domain.MatchAttendance;
import com.sinte.backend.domain.enums.AttendanceStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MatchAttendanceRepository extends JpaRepository<MatchAttendance, UUID> {
    List<MatchAttendance> findByMatchIdOrderByStatusAsc(UUID matchId);

    List<MatchAttendance> findByMatchIdAndStatus(UUID matchId, AttendanceStatus status);

    Optional<MatchAttendance> findByMatchIdAndUserId(UUID matchId, UUID userId);

    boolean existsByMatchIdAndUserId(UUID matchId, UUID userId);

    @Query("""
           SELECT ma
           FROM MatchAttendance ma
           JOIN FETCH ma.match m
           JOIN FETCH ma.user u
           WHERE u.id = :userId
           ORDER BY m.createdAt DESC, m.startsAt DESC
           """)
    List<MatchAttendance> findByUserIdForMyAttendanceList(@Param("userId") UUID userId);

    long countByMatchIdAndStatus(UUID matchId, AttendanceStatus status);

    long countByMatchId(UUID matchId);

    List<MatchAttendance> findByMatchIdAndStatusOrderByRespondedAtAsc(UUID matchId, AttendanceStatus status);
}
