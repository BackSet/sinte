package com.sinte.backend.domain;

import com.sinte.backend.domain.enums.RecurrenceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(
        name = "match_series_rules",
        uniqueConstraints = @UniqueConstraint(name = "uk_match_series_rules", columnNames = {"series_id", "day_of_week", "start_time"})
)
public class MatchSeriesRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "series_id", nullable = false)
    private MatchSeries series;

    @Column(name = "day_of_week")
    private Short dayOfWeek;

    @Enumerated(EnumType.STRING)
    @Column(name = "recurrence_type", nullable = false, length = 30)
    private RecurrenceType recurrenceType;

    @Column(name = "interval_days")
    private Integer intervalDays;

    @Column(name = "day_of_month")
    private Short dayOfMonth;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    protected MatchSeriesRule() {
    }

    public MatchSeriesRule(
            MatchSeries series,
            RecurrenceType recurrenceType,
            Short dayOfWeek,
            Integer intervalDays,
            Short dayOfMonth,
            LocalTime startTime
    ) {
        this.series = series;
        this.recurrenceType = recurrenceType;
        this.dayOfWeek = dayOfWeek;
        this.intervalDays = intervalDays;
        this.dayOfMonth = dayOfMonth;
        this.startTime = startTime;
    }

    public MatchSeries getSeries() {
        return series;
    }

    public Short getDayOfWeek() {
        return dayOfWeek;
    }

    public RecurrenceType getRecurrenceType() {
        return recurrenceType;
    }

    public Integer getIntervalDays() {
        return intervalDays;
    }

    public Short getDayOfMonth() {
        return dayOfMonth;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

}
