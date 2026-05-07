package com.sinte.backend.api.v1.positions;

import com.sinte.backend.repository.PositionRepository;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/positions")
public class PositionsController {

    private final PositionRepository positionRepository;

    public PositionsController(PositionRepository positionRepository) {
        this.positionRepository = positionRepository;
    }

    @GetMapping
    public ResponseEntity<List<PositionResponse>> list() {
        return ResponseEntity.ok(
                positionRepository.findAllByOrderBySortOrder().stream()
                        .map(p -> new PositionResponse(p.getCode(), p.getName(), p.getSortOrder()))
                        .toList()
        );
    }

    public record PositionResponse(String code, String name, Short sortOrder) {
    }
}