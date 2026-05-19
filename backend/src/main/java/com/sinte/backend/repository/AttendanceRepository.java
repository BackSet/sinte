package com.sinte.backend.repository;

import com.sinte.backend.domain.Attendance;
import com.sinte.backend.domain.enums.AttendanceStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {

    List<Attendance> findByMatchIdOrderByRespondedAtAsc(UUID matchId);

    List<Attendance> findByMatchIdAndStatusOrderByRespondedAtAsc(UUID matchId, AttendanceStatus status);

    Optional<Attendance> findByMatchIdAndUserId(UUID matchId, UUID userId);

    long countByMatchIdAndStatus(UUID matchId, AttendanceStatus status);

    @Query("SELECT a FROM Attendance a WHERE a.match.id = :matchId ORDER BY a.status ASC, a.respondedAt ASC")
    List<Attendance> findByMatchIdOrderByStatusAsc(@Param("matchId") UUID matchId);

    @Modifying
    @Query("DELETE FROM Attendance a WHERE a.match.id = :matchId")
    int deleteByMatchId(@Param("matchId") UUID matchId);

    boolean existsByMatchIdAndUserId(UUID matchId, UUID userId);

    @Query("SELECT a FROM Attendance a WHERE a.user.id = :userId ORDER BY a.match.startsAt ASC")
    List<Attendance> findByUserIdForMyAttendanceList(@Param("userId") UUID userId);
}
