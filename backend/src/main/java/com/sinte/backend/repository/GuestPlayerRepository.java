package com.sinte.backend.repository;

import com.sinte.backend.domain.GuestPlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface GuestPlayerRepository extends JpaRepository<GuestPlayer, UUID> {
    List<GuestPlayer> findByMatchIdOrderByRespondedAtAsc(UUID matchId);
    List<GuestPlayer> findByMatchIdAndStatusOrderByRespondedAtAsc(UUID matchId, String status);
    long countByMatchIdAndStatus(UUID matchId, String status);
    void deleteByMatchId(UUID matchId);
}