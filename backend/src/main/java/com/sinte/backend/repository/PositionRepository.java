package com.sinte.backend.repository;

import com.sinte.backend.domain.Position;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PositionRepository extends JpaRepository<Position, String> {
    List<Position> findAllByOrderBySortOrder();
}