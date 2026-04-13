package com.sinte.backend.repository;

import com.sinte.backend.domain.MatchTeamPlayer;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MatchTeamPlayerRepository extends JpaRepository<MatchTeamPlayer, UUID> {
    @Query("""
           SELECT mtp
           FROM MatchTeamPlayer mtp
           WHERE mtp.team.match.id = :matchId
           ORDER BY mtp.team.teamNumber ASC, mtp.user.fullName ASC
           """)
    List<MatchTeamPlayer> findByMatchId(@Param("matchId") UUID matchId);

    @Modifying
    @Query("DELETE FROM MatchTeamPlayer mtp WHERE mtp.team.match.id = :matchId")
    void deleteByMatchId(@Param("matchId") UUID matchId);
}
