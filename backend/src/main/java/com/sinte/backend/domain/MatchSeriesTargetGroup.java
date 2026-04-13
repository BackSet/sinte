package com.sinte.backend.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.UUID;

@Entity
@Table(
        name = "match_series_target_groups",
        uniqueConstraints = @UniqueConstraint(name = "uk_match_series_target_groups", columnNames = {"series_id", "group_id"})
)
public class MatchSeriesTargetGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "series_id", nullable = false)
    private MatchSeries series;

    @ManyToOne(optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private SinteGroup group;

    protected MatchSeriesTargetGroup() {
    }

    public MatchSeriesTargetGroup(MatchSeries series, SinteGroup group) {
        this.series = series;
        this.group = group;
    }

    public UUID getId() {
        return id;
    }

    public MatchSeries getSeries() {
        return series;
    }

    public SinteGroup getGroup() {
        return group;
    }
}
