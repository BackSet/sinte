package com.sinte.backend.service;

import com.sinte.backend.domain.MatchSeries;
import com.sinte.backend.repository.MatchSeriesRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.series.generation", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SeriesGenerationScheduler {

    private final MatchService matchService;
    private final MatchSeriesRepository matchSeriesRepository;

    public SeriesGenerationScheduler(MatchService matchService, MatchSeriesRepository matchSeriesRepository) {
        this.matchService = matchService;
        this.matchSeriesRepository = matchSeriesRepository;
    }

    @Scheduled(cron = "${app.series.generation.cron:0 */5 * * * *}")
    public void generateUpcomingMatches() {
        for (MatchSeries series : matchSeriesRepository.findByActiveTrue()) {
            matchService.generateNextMatchIfDue(series);
        }
    }
}
