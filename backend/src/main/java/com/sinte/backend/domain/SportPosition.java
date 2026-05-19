package com.sinte.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "sport_positions")
public class SportPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 30)
    private String sport;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(nullable = false, length = 10)
    private String abbreviation;

    protected SportPosition() {
    }

    public SportPosition(String sport, String name, String abbreviation) {
        this.sport = sport;
        this.name = name;
        this.abbreviation = abbreviation;
    }

    public UUID getId() {
        return id;
    }

    public String getSport() {
        return sport;
    }

    public String getName() {
        return name;
    }

    public String getAbbreviation() {
        return abbreviation;
    }
}
