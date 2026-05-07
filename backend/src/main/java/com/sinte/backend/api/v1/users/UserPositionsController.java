package com.sinte.backend.api.v1.users;

import com.sinte.backend.service.DomainException;
import com.sinte.backend.service.UserPositionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/{userId}/positions")
public class UserPositionsController {

    private final UserPositionService userPositionService;

    public UserPositionsController(UserPositionService userPositionService) {
        this.userPositionService = userPositionService;
    }

    @GetMapping
    public ResponseEntity<List<UserPositionService.UserPositionResponse>> list(@PathVariable UUID userId) {
        return ResponseEntity.ok(userPositionService.getUserPositions(userId));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<List<UserPositionService.UserPositionResponse>> replace(
            @PathVariable UUID userId,
            @Valid @RequestBody List<PositionAssignmentRequest> assignments
    ) {
        List<UserPositionService.PositionAssignment> serviceAssignments = assignments.stream()
                .map(a -> new UserPositionService.PositionAssignment(a.positionCode(), a.priority()))
                .toList();
        return ResponseEntity.ok(userPositionService.setUserPositions(userId, serviceAssignments));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<UserPositionService.UserPositionResponse> add(
            @PathVariable UUID userId,
            @Valid @RequestBody AddPositionRequest request
    ) {
        return ResponseEntity.ok(userPositionService.addPosition(userId, request.positionCode(), request.priority()));
    }

    @DeleteMapping("/{positionCode}")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<Void> remove(@PathVariable UUID userId, @PathVariable String positionCode) {
        userPositionService.removePosition(userId, positionCode);
        return ResponseEntity.noContent().build();
    }

    public record PositionAssignmentRequest(
            @NotBlank String positionCode,
            @Min(1) short priority
    ) {
    }

    public record AddPositionRequest(
            @NotBlank String positionCode,
            @Min(1) short priority
    ) {
    }
}