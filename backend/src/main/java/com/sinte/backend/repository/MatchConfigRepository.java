package com.sinte.backend.repository;

import com.sinte.backend.domain.MatchConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface MatchConfigRepository extends JpaRepository<MatchConfig, UUID> {
}