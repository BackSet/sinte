package com.sinte.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "positions")
public class Position {

    @Id
    @Column(length = 40)
    private String code;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(name = "sort_order")
    private Short sortOrder;

    protected Position() {
    }

    public Position(String code, String name, Short sortOrder) {
        this.code = code;
        this.name = name;
        this.sortOrder = sortOrder;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public Short getSortOrder() {
        return sortOrder;
    }
}