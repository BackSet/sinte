package com.sinte.backend;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sinte.backend.domain.GuestPlayer;
import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.enums.MatchSourceType;
import com.sinte.backend.domain.enums.RoleCode;
import com.sinte.backend.repository.GuestPlayerPositionRepository;
import com.sinte.backend.repository.GuestPlayerRepository;
import com.sinte.backend.repository.MatchAttendanceRepository;
import com.sinte.backend.repository.MatchPairRepository;
import com.sinte.backend.repository.MatchRepository;
import com.sinte.backend.repository.MatchTeamPlayerRepository;
import com.sinte.backend.repository.MatchTeamRepository;
import com.sinte.backend.repository.UserPositionRepository;
import com.sinte.backend.repository.UserRepository;
import com.sinte.backend.repository.UserRoleRepository;
import com.sinte.backend.service.AttendanceService;
import com.sinte.backend.service.DomainException;
import com.sinte.backend.service.GuestPlayerService;
import com.sinte.backend.service.MatchPairingService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AuthorizationHardeningServiceTest {

    @Mock
    private GuestPlayerRepository guestPlayerRepository;
    @Mock
    private GuestPlayerPositionRepository guestPlayerPositionRepository;
    @Mock
    private MatchRepository matchRepository;
    @Mock
    private MatchAttendanceRepository matchAttendanceRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserRoleRepository userRoleRepository;

    @Mock
    private UserPositionRepository userPositionRepository;
    @Mock
    private MatchPairRepository matchPairRepository;
    @Mock
    private MatchTeamRepository matchTeamRepository;
    @Mock
    private MatchTeamPlayerRepository matchTeamPlayerRepository;

    private GuestPlayerService guestPlayerService;
    private MatchPairingService matchPairingService;
    private AttendanceService attendanceService;

    @BeforeEach
    void setUp() {
        guestPlayerService = new GuestPlayerService(
                guestPlayerRepository,
                guestPlayerPositionRepository,
                matchRepository,
                matchAttendanceRepository,
                userRepository,
                userRoleRepository
        );

        matchPairingService = new MatchPairingService(
                matchAttendanceRepository,
                guestPlayerRepository,
                userPositionRepository,
                guestPlayerPositionRepository,
                matchPairRepository,
                matchTeamRepository,
                matchTeamPlayerRepository,
                matchRepository,
                userRepository,
                userRoleRepository
        );

        attendanceService = new AttendanceService(matchAttendanceRepository, userRoleRepository);
    }

    @Test
    void guestCreationAllowsCalledPlayerAndBlocksOutsider() {
        UUID matchId = UUID.randomUUID();
        UUID calledPlayerId = UUID.randomUUID();
        UUID outsiderId = UUID.randomUUID();

        Match match = buildMatch(matchId, UUID.randomUUID());
        User calledPlayer = buildUser(calledPlayerId);
        User outsider = buildUser(outsiderId);

        when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
        when(userRepository.findById(calledPlayerId)).thenReturn(Optional.of(calledPlayer));
        when(userRepository.findById(outsiderId)).thenReturn(Optional.of(outsider));
        when(userRoleRepository.existsByUserIdAndRoleCode(calledPlayerId, RoleCode.DT)).thenReturn(false);
        when(userRoleRepository.existsByUserIdAndRoleCode(calledPlayerId, RoleCode.ADMIN)).thenReturn(false);
        when(matchAttendanceRepository.existsByMatchIdAndUserId(matchId, calledPlayerId)).thenReturn(true);
        when(guestPlayerRepository.save(any(GuestPlayer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        guestPlayerService.createGuestPlayer(matchId, calledPlayerId, "Invitado", "inv", 10, List.of("CENTER_BACK"));

        when(userRoleRepository.existsByUserIdAndRoleCode(outsiderId, RoleCode.DT)).thenReturn(false);
        when(userRoleRepository.existsByUserIdAndRoleCode(outsiderId, RoleCode.ADMIN)).thenReturn(false);
        when(matchAttendanceRepository.existsByMatchIdAndUserId(matchId, outsiderId)).thenReturn(false);

        assertThatThrownBy(() -> guestPlayerService.createGuestPlayer(
                matchId, outsiderId, "Invitado 2", "inv2", 11, List.of("SETTER")
        )).isInstanceOf(DomainException.class)
                .hasMessageContaining("jugador convocado");
    }

    @Test
    void guestMutationRejectsCrossMatchGuestIdor() {
        UUID requestMatchId = UUID.randomUUID();
        UUID guestMatchId = UUID.randomUUID();
        UUID guestId = UUID.randomUUID();
        UUID requesterId = UUID.randomUUID();

        Match guestMatch = buildMatch(guestMatchId, UUID.randomUUID());
        User creator = buildUser(requesterId);
        GuestPlayer guest = new GuestPlayer(guestMatch, creator, "Invitado", "inv");
        ReflectionTestUtils.setField(guest, "id", guestId);

        when(guestPlayerRepository.findById(guestId)).thenReturn(Optional.of(guest));

        assertThatThrownBy(() -> guestPlayerService.confirmGuest(requestMatchId, guestId, requesterId))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("no pertenece al partido");
    }

    @Test
    void pairingAndAttendanceDenyUnauthorizedAccess() {
        UUID matchId = UUID.randomUUID();
        UUID ownerDtId = UUID.randomUUID();
        UUID anotherDtId = UUID.randomUUID();
        UUID outsiderPlayerId = UUID.randomUUID();
        Match match = buildMatch(matchId, ownerDtId);

        when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
        when(userRoleRepository.existsByUserIdAndRoleCode(anotherDtId, RoleCode.ADMIN)).thenReturn(false);
        when(userRoleRepository.existsByUserIdAndRoleCode(anotherDtId, RoleCode.DT)).thenReturn(true);

        assertThatThrownBy(() -> matchPairingService.previewPairs(matchId, anotherDtId))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("gestionar este partido");
        verify(matchAttendanceRepository, never()).findByMatchIdAndStatusOrderByRespondedAtAsc(any(), any());

        when(userRoleRepository.existsByUserIdAndRoleCode(outsiderPlayerId, RoleCode.ADMIN)).thenReturn(false);
        when(userRoleRepository.existsByUserIdAndRoleCode(outsiderPlayerId, RoleCode.DT)).thenReturn(false);
        when(matchAttendanceRepository.existsByMatchIdAndUserId(matchId, outsiderPlayerId)).thenReturn(false);

        assertThatThrownBy(() -> attendanceService.getAttendanceByMatch(matchId, outsiderPlayerId))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("ver asistencias");
    }

    private static Match buildMatch(UUID matchId, UUID createdByUserId) {
        User owner = buildUser(createdByUserId);
        Match match = new Match(
                owner,
                "Partido prueba",
                "desc",
                "cancha",
                OffsetDateTime.now().plusDays(1),
                OffsetDateTime.now().plusDays(1).plusHours(2),
                MatchSourceType.MANUAL,
                null,
                null
        );
        ReflectionTestUtils.setField(match, "id", matchId);
        return match;
    }

    private static User buildUser(UUID userId) {
        User user = new User("Test User", "user@test.com", "0990000000", "test", "T001", "hash");
        ReflectionTestUtils.setField(user, "id", userId);
        return user;
    }
}
