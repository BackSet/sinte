package com.sinte.backend.domain;

import com.sinte.backend.domain.enums.MatchSourceType;
import com.sinte.backend.domain.enums.MatchStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "matches")
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 180)
    private String location;

    @Column(name = "starts_at", nullable = false)
    private OffsetDateTime startsAt;

    @Column(name = "ends_at")
    private OffsetDateTime endsAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MatchStatus status = MatchStatus.SCHEDULED;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private MatchSourceType sourceType = MatchSourceType.MANUAL;

    @ManyToOne
    @JoinColumn(name = "series_id")
    private MatchSeries series;

    @Column(name = "target_players")
    private Integer targetPlayers;

    @Column(name = "attendance_open", nullable = false)
    private boolean attendanceOpen = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected Match() {
    }

    public Match(
            User createdBy,
            String title,
            String description,
            String location,
            OffsetDateTime startsAt,
            OffsetDateTime endsAt,
            MatchSourceType sourceType,
            MatchSeries series
    ) {
        this.createdBy = createdBy;
        this.title = title;
        this.description = description;
        this.location = location;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.sourceType = sourceType;
        this.series = series;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getLocation() {
        return location;
    }

    public OffsetDateTime getStartsAt() {
        return startsAt;
    }

    public OffsetDateTime getEndsAt() {
        return endsAt;
    }

    public MatchStatus getStatus() {
        return status;
    }

    public MatchSourceType getSourceType() {
        return sourceType;
    }

    public MatchSeries getSeries() {
        return series;
    }

    public Integer getTargetPlayers() {
        return targetPlayers;
    }

    public boolean isAttendanceOpen() {
        return attendanceOpen;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void update(String title, String description, String location, OffsetDateTime startsAt, OffsetDateTime endsAt) {
        this.title = title;
        this.description = description;
        this.location = location;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
    }

    public void updateStatus(MatchStatus status) {
        this.status = status;
    }

    public void configureAttendance(Integer targetPlayers, boolean attendanceOpen) {
        this.targetPlayers = targetPlayers;
        this.attendanceOpen = attendanceOpen;
    }

    public void updateAttendanceOpen(boolean attendanceOpen) {
        this.attendanceOpen = attendanceOpen;
    }
}
