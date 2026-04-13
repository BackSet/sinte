package com.sinte.backend.domain;

import com.sinte.backend.domain.enums.AttendanceStatus;
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
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "match_attendance",
        uniqueConstraints = @UniqueConstraint(name = "uk_match_attendance", columnNames = {"match_id", "user_id"})
)
public class MatchAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus status = AttendanceStatus.PENDING;

    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    @Column(length = 500)
    private String comment;

    protected MatchAttendance() {
    }

    public MatchAttendance(Match match, User user) {
        this.match = match;
        this.user = user;
    }

    public UUID getId() {
        return id;
    }

    public Match getMatch() {
        return match;
    }

    public User getUser() {
        return user;
    }

    public AttendanceStatus getStatus() {
        return status;
    }

    public OffsetDateTime getRespondedAt() {
        return respondedAt;
    }

    public String getComment() {
        return comment;
    }

    public void respond(AttendanceStatus status, String comment) {
        this.status = status;
        this.comment = comment;
        this.respondedAt = OffsetDateTime.now();
    }

    public void resetToPending() {
        this.status = AttendanceStatus.PENDING;
        this.comment = null;
        this.respondedAt = null;
    }
}
