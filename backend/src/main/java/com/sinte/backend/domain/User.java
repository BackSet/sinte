package com.sinte.backend.domain;

import com.sinte.backend.domain.enums.PlayerPosition;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, unique = true, length = 180)
    private String email;

    @Column(nullable = false, unique = true, length = 30)
    private String phone;

    @Column(length = 80)
    private String nickname;

    @Column(name = "nickname_tag", length = 4)
    private String nicknameTag;

    @Enumerated(EnumType.STRING)
    @Column(name = "primary_position", nullable = false, length = 40)
    private PlayerPosition primaryPosition;

    @Enumerated(EnumType.STRING)
    @Column(name = "secondary_position", length = 40)
    private PlayerPosition secondaryPosition;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected User() {
    }

    public User(
            String fullName,
            String email,
            String phone,
            String nickname,
            String nicknameTag,
            PlayerPosition primaryPosition,
            PlayerPosition secondaryPosition,
            String passwordHash
    ) {
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.nickname = nickname;
        this.nicknameTag = nicknameTag;
        this.primaryPosition = primaryPosition;
        this.secondaryPosition = secondaryPosition;
        this.passwordHash = passwordHash;
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getNicknameTag() {
        return nicknameTag;
    }

    public void setNicknameTag(String nicknameTag) {
        this.nicknameTag = nicknameTag;
    }

    public String getPlayerHandle() {
        if (nickname == null || nicknameTag == null) {
            return null;
        }
        return nickname + "#" + nicknameTag;
    }

    public PlayerPosition getPrimaryPosition() {
        return primaryPosition;
    }

    public void setPrimaryPosition(PlayerPosition primaryPosition) {
        this.primaryPosition = primaryPosition;
    }

    public PlayerPosition getSecondaryPosition() {
        return secondaryPosition;
    }

    public void setSecondaryPosition(PlayerPosition secondaryPosition) {
        this.secondaryPosition = secondaryPosition;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
