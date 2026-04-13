package com.sinte.backend.repository;

import com.sinte.backend.domain.MatchSeriesTargetGroup;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MatchSeriesTargetGroupRepository extends JpaRepository<MatchSeriesTargetGroup, UUID> {
    @Query("""
           SELECT mstg.group.id
           FROM MatchSeriesTargetGroup mstg
           WHERE mstg.series.id = :seriesId
           """)
    List<UUID> findGroupIdsBySeriesId(@Param("seriesId") UUID seriesId);

    @Modifying
    @Query("DELETE FROM MatchSeriesTargetGroup mstg WHERE mstg.series.id = :seriesId")
    void deleteBySeriesId(@Param("seriesId") UUID seriesId);
}
