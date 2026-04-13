package com.sinte.backend.repository;

import com.sinte.backend.domain.MatchSeriesRule;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchSeriesRuleRepository extends JpaRepository<MatchSeriesRule, UUID> {
    List<MatchSeriesRule> findBySeriesId(UUID seriesId);
}
