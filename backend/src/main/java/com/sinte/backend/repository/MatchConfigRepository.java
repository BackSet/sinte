package com.sinte.backend.repository;

import com.sinte.backend.domain.MatchConfig;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MatchConfigRepository extends JpaRepository<MatchConfig, UUID> {
    List<MatchConfig> findAllByOrderByCreatedAtDesc();
}