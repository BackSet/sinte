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
        name = "match_target_groups",
        uniqueConstraints = @UniqueConstraint(name = "uk_match_target_groups", columnNames = {"match_id", "group_id"})
)
public class MatchTargetGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @ManyToOne(optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private SinteGroup group;

    protected MatchTargetGroup() {
    }

    public MatchTargetGroup(Match match, SinteGroup group) {
        this.match = match;
        this.group = group;
    }

    public UUID getId() {
        return id;
    }

    public Match getMatch() {
        return match;
    }

    public SinteGroup getGroup() {
        return group;
    }
}
