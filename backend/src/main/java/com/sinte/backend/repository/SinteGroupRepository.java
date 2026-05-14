package com.sinte.backend.repository;

import com.sinte.backend.domain.SinteGroup;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SinteGroupRepository extends JpaRepository<SinteGroup, UUID> {
    boolean existsByNameIgnoreCase(String name);

    List<SinteGroup> findAllByOrderByCreatedAtDesc();

    List<SinteGroup> findByCreatedByIdOrderByCreatedAtDesc(UUID createdByUserId);
}
