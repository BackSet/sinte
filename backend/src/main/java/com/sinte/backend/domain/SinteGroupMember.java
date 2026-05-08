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
        name = "sinte_group_members",
        uniqueConstraints = @UniqueConstraint(name = "uk_sinte_group_members", columnNames = {"group_id", "user_id"})
)
public class SinteGroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private SinteGroup group;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 30)
    private String rol;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected SinteGroupMember() {
    }

    public SinteGroupMember(SinteGroup group, User user, String rol) {
        this.group = group;
        this.user = user;
        this.rol = rol;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public SinteGroup getGroup() {
        return group;
    }

    public User getUser() {
        return user;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}