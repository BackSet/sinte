package com.sinte.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "match_configs")
public class MatchConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 180)
    private String location;

    @Column(name = "target_players", nullable = false)
    private Integer targetPlayers;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes = 120;

    @Column(nullable = false, length = 60)
    private String timezone;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected MatchConfig() {
    }

    public MatchConfig(String location, Integer targetPlayers, Integer durationMinutes, String timezone, String description) {
        this.location = location;
        this.targetPlayers = targetPlayers;
        this.durationMinutes = durationMinutes;
        this.timezone = timezone;
        this.description = description;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public String getLocation() {
        return location;
    }

    public Integer getTargetPlayers() {
        return targetPlayers;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public String getTimezone() {
        return timezone;
    }

    public String getDescription() {
        return description;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void update(String location, Integer targetPlayers, Integer durationMinutes, String timezone, String description) {
        this.location = location;
        this.targetPlayers = targetPlayers;
        this.durationMinutes = durationMinutes;
        this.timezone = timezone;
        this.description = description;
    }
}