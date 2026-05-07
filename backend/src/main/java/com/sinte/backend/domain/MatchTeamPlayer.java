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
@Table(name = "match_team_players")
public class MatchTeamPlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private MatchTeam team;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "guest_player_id")
    private GuestPlayer guestPlayer;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected MatchTeamPlayer() {
    }

    public MatchTeamPlayer(MatchTeam team, User user) {
        this.team = team;
        this.user = user;
    }

    public MatchTeamPlayer(MatchTeam team, GuestPlayer guestPlayer) {
        this.team = team;
        this.guestPlayer = guestPlayer;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public MatchTeam getTeam() {
        return team;
    }

    public User getUser() {
        return user;
    }

    public GuestPlayer getGuestPlayer() {
        return guestPlayer;
    }

    public boolean isGuest() {
        return guestPlayer != null;
    }

    public String getPlayerName() {
        if (user != null) {
            return user.getFullName();
        }
        if (guestPlayer != null) {
            return guestPlayer.getFullName();
        }
        return null;
    }

    public String getPlayerHandle() {
        if (user != null) {
            return user.getPlayerHandle();
        }
        return null;
    }

    public String getPrimaryPosition() {
        return null;
    }
}