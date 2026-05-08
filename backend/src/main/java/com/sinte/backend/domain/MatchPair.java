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
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "match_pairs")
public class MatchPair {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @ManyToOne
    @JoinColumn(name = "player_a_id")
    private User playerA;

    @ManyToOne
    @JoinColumn(name = "player_b_id")
    private User playerB;

    @ManyToOne
    @JoinColumn(name = "guest_player_a_id")
    private GuestPlayer guestPlayerA;

    @ManyToOne
    @JoinColumn(name = "guest_player_b_id")
    private GuestPlayer guestPlayerB;

    @Column(name = "position_code", nullable = false, length = 40)
    private String positionCode;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected MatchPair() {
    }

    public MatchPair(Match match, User playerA, User playerB, GuestPlayer guestPlayerA, GuestPlayer guestPlayerB, String positionCode) {
        this.match = match;
        this.playerA = playerA;
        this.playerB = playerB;
        this.guestPlayerA = guestPlayerA;
        this.guestPlayerB = guestPlayerB;
        this.positionCode = positionCode;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public Match getMatch() {
        return match;
    }

    public User getPlayerA() {
        return playerA;
    }

    public User getPlayerB() {
        return playerB;
    }

    public GuestPlayer getGuestPlayerA() {
        return guestPlayerA;
    }

    public GuestPlayer getGuestPlayerB() {
        return guestPlayerB;
    }

    public String getPositionCode() {
        return positionCode;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public String getPlayerAName() {
        if (playerA != null) return playerA.getFullName();
        if (guestPlayerA != null) return guestPlayerA.getFullName();
        return null;
    }

    public String getPlayerBName() {
        if (playerB != null) return playerB.getFullName();
        if (guestPlayerB != null) return guestPlayerB.getFullName();
        return null;
    }

    public String getPlayerAHandle() {
        if (playerA != null) return playerA.getPlayerHandle();
        return null;
    }

    public String getPlayerBHandle() {
        if (playerB != null) return playerB.getPlayerHandle();
        return null;
    }
}