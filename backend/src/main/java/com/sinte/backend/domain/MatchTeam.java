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
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "match_teams",
        uniqueConstraints = @UniqueConstraint(name = "uk_match_teams_number", columnNames = {"match_id", "team_number"})
)
public class MatchTeam {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @Column(name = "team_number", nullable = false)
    private Integer teamNumber;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected MatchTeam() {
    }

    public MatchTeam(Match match, Integer teamNumber, String name) {
        this.match = match;
        this.teamNumber = teamNumber;
        this.name = name;
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

    public Integer getTeamNumber() {
        return teamNumber;
    }

    public String getName() {
        return name;
    }
}
