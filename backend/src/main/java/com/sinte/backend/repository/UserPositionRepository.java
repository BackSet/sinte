package com.sinte.backend.repository;

import com.sinte.backend.domain.UserPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface UserPositionRepository extends JpaRepository<UserPosition, UUID> {
    List<UserPosition> findByUserIdOrderByPriority(UUID userId);
    List<UserPosition> findByUserIdInOrderByPriority(List<UUID> userIds);
    void deleteByUserId(UUID userId);
    boolean existsByUserIdAndPositionCode(UUID userId, String positionCode);
}