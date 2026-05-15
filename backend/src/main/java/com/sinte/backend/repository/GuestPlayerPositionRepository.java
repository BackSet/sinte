package com.sinte.backend.repository;

import com.sinte.backend.domain.GuestPlayerPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface GuestPlayerPositionRepository extends JpaRepository<GuestPlayerPosition, UUID> {
    List<GuestPlayerPosition> findByGuestPlayerIdOrderByPriority(UUID guestPlayerId);
    List<GuestPlayerPosition> findByGuestPlayerIdInOrderByPriority(List<UUID> guestPlayerIds);
    void deleteByGuestPlayerId(UUID guestPlayerId);

    @Modifying
    @Query("DELETE FROM GuestPlayerPosition gpp WHERE gpp.guestPlayer.id IN (SELECT gp.id FROM GuestPlayer gp WHERE gp.match.id = :matchId)")
    void deleteByGuestPlayerMatchId(@Param("matchId") UUID matchId);
}