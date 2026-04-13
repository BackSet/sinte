package com.sinte.backend.service;

import com.sinte.backend.config.SeriesGenerationProperties;
import java.time.LocalDate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.series.generation", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SeriesGenerationScheduler {

    private final MatchService matchService;
    private final SeriesGenerationProperties properties;

    public SeriesGenerationScheduler(MatchService matchService, SeriesGenerationProperties properties) {
        this.matchService = matchService;
        this.properties = properties;
    }

    @Scheduled(cron = "${app.series.generation.cron:0 0 3 * * *}")
    public void generateUpcomingMatches() {
        LocalDate from = LocalDate.now();
        LocalDate to = from.plusDays(Math.max(1, properties.getHorizonDays()));
        matchService.generateMatchesForActiveSeries(from, to);
    }
}
