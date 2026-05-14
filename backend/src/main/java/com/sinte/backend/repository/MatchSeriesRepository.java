package com.sinte.backend.repository;

import com.sinte.backend.domain.MatchSeries;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchSeriesRepository extends JpaRepository<MatchSeries, UUID> {
    List<MatchSeries> findByActiveTrue();

    List<MatchSeries> findAllByOrderByCreatedAtDesc();
}
