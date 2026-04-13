package com.sinte.backend.repository;

import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.enums.MatchStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MatchRepository extends JpaRepository<Match, UUID> {
    List<Match> findByStartsAtBetweenOrderByStartsAtAsc(OffsetDateTime from, OffsetDateTime to);

    List<Match> findByStartsAtBetweenAndStatusOrderByStartsAtAsc(OffsetDateTime from, OffsetDateTime to, MatchStatus status);

    boolean existsBySeriesIdAndStartsAt(UUID seriesId, OffsetDateTime startsAt);

    @Query("""
           SELECT DISTINCT m
           FROM Match m
           JOIN MatchAttendance ma ON ma.match.id = m.id
           WHERE ma.user.id = :userId
             AND (:from IS NULL OR m.startsAt >= :from)
             AND (:to IS NULL OR m.startsAt <= :to)
             AND (:status IS NULL OR m.status = :status)
           ORDER BY m.startsAt ASC
           """)
    List<Match> findUserMatches(
            @Param("userId") UUID userId,
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to,
            @Param("status") MatchStatus status
    );
}
