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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "attendances")
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "external_name", length = 120)
    private String externalName;

    @ManyToOne
    @JoinColumn(name = "invited_by_user_id")
    private User invitedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus status = AttendanceStatus.PENDING;

    @ManyToOne
    @JoinColumn(name = "position_id")
    private SportPosition position;

    @ManyToOne
    @JoinColumn(name = "team_id")
    private MatchTeam team;

    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected Attendance() {
    }

    public Attendance(Match match, User user) {
        this.match = match;
        this.user = user;
    }

    public Attendance(Match match, User user, User invitedBy) {
        this.match = match;
        this.user = user;
        this.invitedBy = invitedBy;
    }

    public static Attendance external(Match match, String externalName) {
        Attendance a = new Attendance();
        a.match = match;
        a.externalName = externalName;
        return a;
    }

    public static Attendance external(Match match, String externalName, User invitedBy) {
        Attendance a = new Attendance();
        a.match = match;
        a.externalName = externalName;
        a.invitedBy = invitedBy;
        return a;
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

    public User getUser() {
        return user;
    }

    public String getExternalName() {
        return externalName;
    }

    public User getInvitedBy() {
        return invitedBy;
    }

    public AttendanceStatus getStatus() {
        return status;
    }

    public SportPosition getPosition() {
        return position;
    }

    public MatchTeam getTeam() {
        return team;
    }

    public OffsetDateTime getRespondedAt() {
        return respondedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public boolean isExternal() {
        return user == null && externalName != null;
    }

    public String getDisplayName() {
        if (user != null) return user.getFullName();
        return externalName;
    }

    public String getDisplayHandle() {
        if (user != null) return user.getPlayerHandle();
        return null;
    }

    public void respond(AttendanceStatus status) {
        this.status = status;
        this.respondedAt = OffsetDateTime.now();
    }

    public void resetToPending() {
        this.status = AttendanceStatus.PENDING;
        this.respondedAt = null;
    }

    public void setTeam(MatchTeam team) {
        this.team = team;
    }

    public void setPosition(SportPosition position) {
        this.position = position;
    }
}
