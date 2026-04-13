package com.sinte.backend.repository;

import com.sinte.backend.domain.MatchTargetGroup;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MatchTargetGroupRepository extends JpaRepository<MatchTargetGroup, UUID> {
    @Query("""
           SELECT mtg.group.id
           FROM MatchTargetGroup mtg
           WHERE mtg.match.id = :matchId
           """)
    List<UUID> findGroupIdsByMatchId(@Param("matchId") UUID matchId);

    @Modifying
    @Query("DELETE FROM MatchTargetGroup mtg WHERE mtg.match.id = :matchId")
    void deleteByMatchId(@Param("matchId") UUID matchId);
}
