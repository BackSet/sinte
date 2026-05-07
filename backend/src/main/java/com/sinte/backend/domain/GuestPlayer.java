package com.sinte.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "guest_players")
public class GuestPlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    protected GuestPlayer() {
    }

    public GuestPlayer(Match match, User createdBy, String fullName) {
        this.match = match;
        this.createdBy = createdBy;
        this.fullName = fullName;
    }

    @jakarta.persistence.PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public Match getMatch() {
        return match;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public String getFullName() {
        return fullName;
    }

    public String getStatus() {
        return status;
    }

    public OffsetDateTime getRespondedAt() {
        return respondedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void confirm() {
        this.status = "YES";
        this.respondedAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    public void decline() {
        this.status = "NO";
        this.respondedAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    public void cancel() {
        this.status = "CANCELLED";
        this.respondedAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    public void resetToPending() {
        this.status = "PENDING";
        this.respondedAt = null;
        this.updatedAt = OffsetDateTime.now();
    }
}