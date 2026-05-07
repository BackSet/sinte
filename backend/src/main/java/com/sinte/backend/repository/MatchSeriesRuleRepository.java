package com.sinte.backend.repository;

import com.sinte.backend.domain.MatchSeriesRule;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MatchSeriesRuleRepository extends JpaRepository<MatchSeriesRule, UUID> {
    List<MatchSeriesRule> findBySeriesId(UUID seriesId);

    @Modifying
    @Query("DELETE FROM MatchSeriesRule r WHERE r.series.id = :seriesId")
    void deleteBySeriesId(@Param("seriesId") UUID seriesId);
}
