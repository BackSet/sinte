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
        name = "guest_player_positions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_guest_positions_guest_priority", columnNames = {"guest_player_id", "priority"}),
                @UniqueConstraint(name = "uk_guest_positions_guest_position", columnNames = {"guest_player_id", "position_code"})
        }
)
public class GuestPlayerPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "guest_player_id", nullable = false)
    private GuestPlayer guestPlayer;

    @Column(name = "position_code", nullable = false, length = 40)
    private String positionCode;

    @Column(nullable = false)
    private short priority;

    protected GuestPlayerPosition() {
    }

    public GuestPlayerPosition(GuestPlayer guestPlayer, String positionCode, short priority) {
        this.guestPlayer = guestPlayer;
        this.positionCode = positionCode;
        this.priority = priority;
    }

    public UUID getId() {
        return id;
    }

    public GuestPlayer getGuestPlayer() {
        return guestPlayer;
    }

    public String getPositionCode() {
        return positionCode;
    }

    public short getPriority() {
        return priority;
    }
}