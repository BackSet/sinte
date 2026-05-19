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
    name = "role_permissions",
    uniqueConstraints = @UniqueConstraint(name = "uk_role_permissions", columnNames = {"role_id", "permission_id"})
)
public class RolePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private SystemRole role;

    @ManyToOne(optional = false)
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;

    protected RolePermission() {
    }

    public RolePermission(SystemRole role, Permission permission) {
        this.role = role;
        this.permission = permission;
    }

    public SystemRole getRole() {
        return role;
    }

    public Permission getPermission() {
        return permission;
    }
}
