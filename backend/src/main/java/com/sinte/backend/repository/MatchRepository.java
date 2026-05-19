package com.sinte.backend.repository;

import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.enums.MatchStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MatchRepository extends JpaRepository<Match, UUID> {
    List<Match> findAllByOrderByCreatedAtDescStartsAtDesc();

    List<Match> findByStartsAtBetweenOrderByCreatedAtDescStartsAtDesc(OffsetDateTime from, OffsetDateTime to);

    List<Match> findByStartsAtBetweenAndStatusOrderByCreatedAtDescStartsAtDesc(
            OffsetDateTime from, OffsetDateTime to, MatchStatus status);

    boolean existsBySeriesIdAndStartsAt(UUID seriesId, OffsetDateTime startsAt);

    List<Match> findBySeriesIdAndStatus(UUID seriesId, MatchStatus status);

    @Modifying
    @Query("UPDATE Match m SET m.series = NULL, m.sourceType = com.sinte.backend.domain.enums.MatchSourceType.MANUAL WHERE m.series.id = :seriesId")
    void unlinkMatchesBySeriesId(@Param("seriesId") UUID seriesId);

    @Query("""
           SELECT DISTINCT m
           FROM Match m
           JOIN Attendance a ON a.match.id = m.id
           WHERE a.user.id = :userId
           ORDER BY m.createdAt DESC, m.startsAt DESC
           """)
    List<Match> findUserMatches(@Param("userId") UUID userId);

    @Query("""
           SELECT DISTINCT m
           FROM Match m
           JOIN Attendance a ON a.match.id = m.id
           WHERE a.user.id = :userId
             AND m.status = :status
           ORDER BY m.createdAt DESC, m.startsAt DESC
           """)
    List<Match> findUserMatchesByStatus(
            @Param("userId") UUID userId,
            @Param("status") MatchStatus status
    );

    @Query("""
           SELECT DISTINCT m
           FROM Match m
           JOIN Attendance a ON a.match.id = m.id
           WHERE a.user.id = :userId
             AND (:from IS NULL OR m.startsAt >= :from)
             AND (:to IS NULL OR m.startsAt <= :to)
           ORDER BY m.createdAt DESC, m.startsAt DESC
           """)
    List<Match> findUserMatchesByRange(
            @Param("userId") UUID userId,
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to
    );

    @Query("""
           SELECT DISTINCT m
           FROM Match m
           JOIN Attendance a ON a.match.id = m.id
           WHERE a.user.id = :userId
             AND (:from IS NULL OR m.startsAt >= :from)
             AND (:to IS NULL OR m.startsAt <= :to)
             AND m.status = :status
           ORDER BY m.createdAt DESC, m.startsAt DESC
           """)
    List<Match> findUserMatchesByRangeAndStatus(
            @Param("userId") UUID userId,
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to,
            @Param("status") MatchStatus status
    );
}
