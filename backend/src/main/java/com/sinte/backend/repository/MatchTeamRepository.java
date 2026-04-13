package com.sinte.backend.repository;

import com.sinte.backend.domain.MatchTeam;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MatchTeamRepository extends JpaRepository<MatchTeam, UUID> {
    List<MatchTeam> findByMatchIdOrderByTeamNumberAsc(UUID matchId);

    @Modifying
    @Query("DELETE FROM MatchTeam mt WHERE mt.match.id = :matchId")
    void deleteByMatchId(@Param("matchId") UUID matchId);
}
