package com.sinte.backend;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.enums.MatchSourceType;
import com.sinte.backend.domain.enums.RoleCode;
import com.sinte.backend.repository.AttendanceRepository;
import com.sinte.backend.repository.MatchPairRepository;
import com.sinte.backend.repository.MatchRepository;
import com.sinte.backend.repository.MatchTeamPlayerRepository;
import com.sinte.backend.repository.MatchTeamRepository;
import com.sinte.backend.repository.UserPositionRepository;
import com.sinte.backend.repository.UserRepository;
import com.sinte.backend.repository.UserRoleRepository;
import com.sinte.backend.service.AttendanceService;
import com.sinte.backend.service.DomainException;
import com.sinte.backend.service.MatchPairingService;
import java.time.OffsetDateTime;
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
    private AttendanceRepository attendanceRepository;
    @Mock
    private MatchRepository matchRepository;
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

    private MatchPairingService matchPairingService;
    private AttendanceService attendanceService;

    @BeforeEach
    void setUp() {
        matchPairingService = new MatchPairingService(
                attendanceRepository,
                userPositionRepository,
                matchPairRepository,
                matchTeamRepository,
                matchTeamPlayerRepository,
                matchRepository,
                userRepository,
                userRoleRepository
        );

        attendanceService = new AttendanceService(attendanceRepository, userRoleRepository);
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
        verify(attendanceRepository, never()).findByMatchIdAndStatusOrderByRespondedAtAsc(any(), any());

        when(userRoleRepository.existsByUserIdAndRoleCode(outsiderPlayerId, RoleCode.ADMIN)).thenReturn(false);
        when(userRoleRepository.existsByUserIdAndRoleCode(outsiderPlayerId, RoleCode.DT)).thenReturn(false);
        when(attendanceRepository.existsByMatchIdAndUserId(matchId, outsiderPlayerId)).thenReturn(false);

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
