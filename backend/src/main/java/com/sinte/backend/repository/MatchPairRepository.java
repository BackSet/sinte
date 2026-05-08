package com.sinte.backend.repository;

import com.sinte.backend.domain.MatchPair;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchPairRepository extends JpaRepository<MatchPair, UUID> {
    List<MatchPair> findByMatchIdOrderByCreatedAtAsc(UUID matchId);
    void deleteByMatchId(UUID matchId);
}