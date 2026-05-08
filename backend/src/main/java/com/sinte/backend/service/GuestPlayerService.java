package com.sinte.backend.service;

import com.sinte.backend.domain.GuestPlayer;
import com.sinte.backend.domain.GuestPlayerPosition;
import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.enums.MatchStatus;
import com.sinte.backend.domain.enums.RoleCode;
import com.sinte.backend.repository.GuestPlayerPositionRepository;
import com.sinte.backend.repository.GuestPlayerRepository;
import com.sinte.backend.repository.MatchRepository;
import com.sinte.backend.repository.UserRepository;
import com.sinte.backend.repository.UserRoleRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GuestPlayerService {

    private final GuestPlayerRepository guestPlayerRepository;
    private final GuestPlayerPositionRepository guestPlayerPositionRepository;
    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    public GuestPlayerService(GuestPlayerRepository guestPlayerRepository, GuestPlayerPositionRepository guestPlayerPositionRepository, MatchRepository matchRepository, UserRepository userRepository, UserRoleRepository userRoleRepository) {
        this.guestPlayerRepository = guestPlayerRepository;
        this.guestPlayerPositionRepository = guestPlayerPositionRepository;
        this.matchRepository = matchRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @Transactional
    public GuestPlayer createGuestPlayer(
            UUID matchId,
            UUID createdByUserId,
            String fullName,
            String nickname,
            Integer shirtNumber,
            List<String> positionCodes
    ) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new DomainException("Partido no encontrado"));
        if (match.getStatus() == MatchStatus.FINISHED) {
            throw new DomainException("No se puede agregar invitados a un partido finalizado");
        }
        User creator = userRepository.findById(createdByUserId)
                .orElseThrow(() -> new DomainException("Usuario no encontrado"));
        boolean isDtOrAdmin = userRoleRepository.existsByUserIdAndRoleCode(createdByUserId, RoleCode.DT)
                || userRoleRepository.existsByUserIdAndRoleCode(createdByUserId, RoleCode.ADMIN);
        if (!isDtOrAdmin) {
            throw new DomainException("Solo DT o ADMIN pueden agregar invitados");
        }

        GuestPlayer guest = new GuestPlayer(match, creator, fullName.trim(), nickname != null ? nickname.trim() : null);
        guest.setShirtNumber(shirtNumber);
        GuestPlayer saved = guestPlayerRepository.save(guest);

        if (positionCodes != null && !positionCodes.isEmpty()) {
            short priority = 1;
            for (String code : positionCodes) {
                GuestPlayerPosition gpp = new GuestPlayerPosition(saved, code, priority++);
                guestPlayerPositionRepository.save(gpp);
            }
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public List<GuestPlayer> listGuestPlayers(UUID matchId) {
        return guestPlayerRepository.findByMatchIdOrderByRespondedAtAsc(matchId);
    }

    @Transactional(readOnly = true)
    public List<GuestPlayerPosition> getGuestPositions(UUID guestPlayerId) {
        return guestPlayerPositionRepository.findByGuestPlayerIdOrderByPriority(guestPlayerId);
    }

    @Transactional
    public GuestPlayer confirmGuest(UUID guestPlayerId, UUID requesterUserId) {
        GuestPlayer guest = guestPlayerRepository.findById(guestPlayerId)
                .orElseThrow(() -> new DomainException("Invitado no encontrado"));
        if (!guest.getCreatedBy().getId().equals(requesterUserId)) {
            boolean isAdmin = userRoleRepository.existsByUserIdAndRoleCode(requesterUserId, RoleCode.ADMIN);
            if (!isAdmin) {
                throw new DomainException("Solo el creador o un ADMIN puede confirmar un invitado");
            }
        }
        guest.confirm();
        return guestPlayerRepository.save(guest);
    }

    @Transactional
    public GuestPlayer declineGuest(UUID guestPlayerId, UUID requesterUserId) {
        GuestPlayer guest = guestPlayerRepository.findById(guestPlayerId)
                .orElseThrow(() -> new DomainException("Invitado no encontrado"));
        if (!guest.getCreatedBy().getId().equals(requesterUserId)) {
            boolean isAdmin = userRoleRepository.existsByUserIdAndRoleCode(requesterUserId, RoleCode.ADMIN);
            if (!isAdmin) {
                throw new DomainException("Solo el creador o un ADMIN puede declinar un invitado");
            }
        }
        guest.decline();
        return guestPlayerRepository.save(guest);
    }

    @Transactional
    public GuestPlayer cancelGuest(UUID guestPlayerId, UUID requesterUserId) {
        GuestPlayer guest = guestPlayerRepository.findById(guestPlayerId)
                .orElseThrow(() -> new DomainException("Invitado no encontrado"));
        if (!guest.getCreatedBy().getId().equals(requesterUserId)) {
            boolean isAdmin = userRoleRepository.existsByUserIdAndRoleCode(requesterUserId, RoleCode.ADMIN);
            if (!isAdmin) {
                throw new DomainException("Solo el creador o un ADMIN puede cancelar un invitado");
            }
        }
        guest.cancel();
        return guestPlayerRepository.save(guest);
    }

    @Transactional
    public GuestPlayer resetGuestToPending(UUID guestPlayerId, UUID requesterUserId) {
        GuestPlayer guest = guestPlayerRepository.findById(guestPlayerId)
                .orElseThrow(() -> new DomainException("Invitado no encontrado"));
        if (!guest.getCreatedBy().getId().equals(requesterUserId)) {
            boolean isAdmin = userRoleRepository.existsByUserIdAndRoleCode(requesterUserId, RoleCode.ADMIN);
            if (!isAdmin) {
                throw new DomainException("Solo el creador o un ADMIN puede resetear un invitado");
            }
        }
        guest.resetToPending();
        return guestPlayerRepository.save(guest);
    }

    @Transactional
    public void deleteGuest(UUID guestPlayerId, UUID requesterUserId) {
        GuestPlayer guest = guestPlayerRepository.findById(guestPlayerId)
                .orElseThrow(() -> new DomainException("Invitado no encontrado"));
        if (!guest.getCreatedBy().getId().equals(requesterUserId)) {
            throw new DomainException("Solo el creador puede eliminar un invitado");
        }
        if ("YES".equals(guest.getStatus())) {
            throw new DomainException("No se puede eliminar un invitado que ya confirmo asistencia");
        }
        guestPlayerPositionRepository.deleteByGuestPlayerId(guestPlayerId);
        guestPlayerRepository.deleteById(guestPlayerId);
    }
}