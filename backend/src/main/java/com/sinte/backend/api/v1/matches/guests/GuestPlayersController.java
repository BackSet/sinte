package com.sinte.backend.api.v1.matches.guests;

import com.sinte.backend.config.security.SecurityUtils;
import com.sinte.backend.domain.GuestPlayer;
import com.sinte.backend.domain.GuestPlayerPosition;
import com.sinte.backend.service.GuestPlayerService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
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
@RequestMapping("/api/v1/matches/{matchId}/guest-players")
public class GuestPlayersController {

    private final GuestPlayerService guestPlayerService;

    public GuestPlayersController(GuestPlayerService guestPlayerService) {
        this.guestPlayerService = guestPlayerService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<GuestPlayerResponse> create(
            @PathVariable UUID matchId,
            @Valid @RequestBody CreateGuestPlayerRequest request
    ) {
        UUID userId = SecurityUtils.currentUserId();
        GuestPlayer guest = guestPlayerService.createGuestPlayer(
                matchId, userId, request.fullName(), request.nickname(), request.shirtNumber(), request.positionCodes()
        );
        return ResponseEntity.ok(toResponse(guest));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<List<GuestPlayerResponse>> list(@PathVariable UUID matchId) {
        UUID userId = SecurityUtils.currentUserId();
        List<GuestPlayer> guests = guestPlayerService.listGuestPlayers(matchId, userId);
        return ResponseEntity.ok(guests.stream().map(this::toResponse).toList());
    }

    @PutMapping("/{guestPlayerId}/attendance")
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<GuestPlayerResponse> updateAttendance(
            @PathVariable UUID matchId,
            @PathVariable UUID guestPlayerId,
            @Valid @RequestBody GuestAttendanceRequest request
    ) {
        UUID userId = SecurityUtils.currentUserId();
        GuestPlayer guest;
        switch (request.status()) {
            case "YES" -> guest = guestPlayerService.confirmGuest(matchId, guestPlayerId, userId);
            case "NO" -> guest = guestPlayerService.declineGuest(matchId, guestPlayerId, userId);
            case "CANCELLED" -> guest = guestPlayerService.cancelGuest(matchId, guestPlayerId, userId);
            case "PENDING" -> guest = guestPlayerService.resetGuestToPending(matchId, guestPlayerId, userId);
            default -> throw new IllegalArgumentException("Estado no valido: " + request.status());
        }
        return ResponseEntity.ok(toResponse(guest));
    }

    @DeleteMapping("/{guestPlayerId}")
    @PreAuthorize("hasAnyRole('DT','ADMIN','PLAYER')")
    public ResponseEntity<Void> delete(@PathVariable UUID matchId, @PathVariable UUID guestPlayerId) {
        UUID userId = SecurityUtils.currentUserId();
        guestPlayerService.deleteGuest(matchId, guestPlayerId, userId);
        return ResponseEntity.noContent().build();
    }

    private GuestPlayerResponse toResponse(GuestPlayer guest) {
        List<GuestPlayerPosition> positions = guestPlayerService.getGuestPositions(guest.getId());
        return new GuestPlayerResponse(
                guest.getId(),
                guest.getMatch().getId(),
                guest.getCreatedBy().getId(),
                guest.getFullName(),
                guest.getNickname(),
                guest.getShirtNumber(),
                guest.getStatus(),
                guest.getRespondedAt(),
                guest.getCreatedAt(),
                positions.stream().map(p -> new PositionEntry(p.getPositionCode(), p.getPriority(), p.isPrimary())).toList()
        );
    }

    public record CreateGuestPlayerRequest(
            @NotBlank @Size(max = 120) String fullName,
            String nickname,
            Integer shirtNumber,
            List<String> positionCodes
    ) {
    }

    public record GuestAttendanceRequest(
            @NotBlank String status
    ) {
    }

    public record GuestPlayerResponse(
            UUID id,
            UUID matchId,
            UUID createdByUserId,
            String fullName,
            String nickname,
            Integer shirtNumber,
            String status,
            OffsetDateTime respondedAt,
            OffsetDateTime createdAt,
            List<PositionEntry> positions
    ) {
    }

    public record PositionEntry(String positionCode, short priority, boolean isPrimary) {
    }
}