package com.sinte.backend.domain;

import jakarta.persistence.Column;
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
        name = "user_positions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_positions_user_priority", columnNames = {"user_id", "priority"}),
                @UniqueConstraint(name = "uk_user_positions_user_position", columnNames = {"user_id", "position_code"})
        }
)
public class UserPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "position_code", nullable = false, length = 40)
    private String positionCode;

    @Column(nullable = false)
    private short priority;

    protected UserPosition() {
    }

    public UserPosition(User user, String positionCode, short priority) {
        this.user = user;
        this.positionCode = positionCode;
        this.priority = priority;
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getPositionCode() {
        return positionCode;
    }

    public short getPriority() {
        return priority;
    }
}