package com.sinte.backend.repository;

import com.sinte.backend.domain.GuestPlayerPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface GuestPlayerPositionRepository extends JpaRepository<GuestPlayerPosition, UUID> {
    List<GuestPlayerPosition> findByGuestPlayerIdOrderByPriority(UUID guestPlayerId);
    List<GuestPlayerPosition> findByGuestPlayerIdInOrderByPriority(List<UUID> guestPlayerIds);
    void deleteByGuestPlayerId(UUID guestPlayerId);
}