package com.sinte.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "match_series")
public class MatchSeries {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;

    @Column(name = "name", nullable = false, length = 120)
    private String defaultTitle;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(nullable = false, length = 60)
    private String timezone;

    @ManyToOne
    @JoinColumn(name = "config_id")
    private MatchConfig config;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected MatchSeries() {
    }

    public MatchSeries(
            User createdBy,
            String defaultTitle,
            LocalDate startDate,
            LocalDate endDate,
            String timezone,
            MatchConfig config
    ) {
        this.createdBy = createdBy;
        this.defaultTitle = defaultTitle;
        this.startDate = startDate;
        this.endDate = endDate;
        this.timezone = timezone;
        this.config = config;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public String getDefaultTitle() {
        return defaultTitle;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public String getTimezone() {
        return timezone;
    }

    public MatchConfig getConfig() {
        return config;
    }

    public boolean isActive() {
        return active;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void deactivate(LocalDate endDate) {
        this.active = false;
        this.endDate = endDate;
    }

    public void activate() {
        this.active = true;
        this.endDate = null;
    }

    public void updateMetadata(String defaultTitle, String timezone) {
        this.defaultTitle = defaultTitle;
        this.timezone = timezone;
    }

    public void setConfig(MatchConfig config) {
        this.config = config;
    }
}