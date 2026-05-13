package com.sinte.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.sinte.backend.api.v1.auth.dto.AuthResponse;
import com.sinte.backend.api.v1.auth.dto.RegisterRequest;
import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.MatchAttendance;
import com.sinte.backend.domain.MatchConfig;
import com.sinte.backend.domain.SinteGroup;
import com.sinte.backend.domain.SinteGroupMember;
import com.sinte.backend.repository.MatchAttendanceRepository;
import com.sinte.backend.repository.NotificationRepository;
import com.sinte.backend.service.AuthService;
import com.sinte.backend.service.GroupService;
import com.sinte.backend.service.MatchConfigService;
import com.sinte.backend.service.MatchService;
import com.sinte.backend.service.dto.CreateMatchRequest;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class GroupMatchTargetingIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private GroupService groupService;

    @Autowired
    private MatchService matchService;

    @Autowired
    private MatchConfigService matchConfigService;

    @Autowired
    private MatchAttendanceRepository matchAttendanceRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Test
    void matchWithTargetGroupNotifiesOnlyGroupMembers() {
        AuthResponse dt = authService.register(new RegisterRequest(
                "DT Principal",
                "dt@test.com",
                "0992222222",
                "dtmaster",
                "DT001",
                1,
                "Secret123!",
                List.of(new RegisterRequest.PositionRequest("CENTER_BACK", 1))
        ));
        AuthResponse playerInGroup = authService.register(new RegisterRequest(
                "Jugador Grupo",
                "player.group@test.com",
                "0993333333",
                "grupo",
                "GR001",
                2,
                "Secret123!",
                List.of(new RegisterRequest.PositionRequest("LEFT_BACK", 1))
        ));
        AuthResponse playerOutGroup = authService.register(new RegisterRequest(
                "Jugador Fuera",
                "player.out@test.com",
                "0994444444",
                "fuera",
                "FU001",
                3,
                "Secret123!",
                List.of(new RegisterRequest.PositionRequest("RIGHT_BACK", 1))
        ));

        SinteGroup group = groupService.createGroup(dt.userId(), "Titulares");
        SinteGroupMember membership = groupService.addMemberByHandle(dt.userId(), group.getId(), playerInGroup.playerHandle(), "TITULAR");
        assertThat(membership.getUser().getId()).isEqualTo(playerInGroup.userId());

        MatchConfig config = matchConfigService.createConfig("Cancha Norte", 14, 90, "America/Bogota", "Test config");

        Match match = matchService.createManualMatch(new CreateMatchRequest(
                dt.userId(),
                config.getId(),
                "Partido Grupo",
                "Solo para titulares",
                OffsetDateTime.now().plusDays(1),
                List.of(group.getId())
        ));

        List<MatchAttendance> attendance = matchAttendanceRepository.findByMatchIdOrderByStatusAsc(match.getId());
        assertThat(attendance).hasSize(1);
        assertThat(attendance.getFirst().getUser().getId()).isEqualTo(playerInGroup.userId());

        assertThat(notificationRepository.findByUserIdOrderByCreatedAtDesc(playerInGroup.userId())).isNotEmpty();
        assertThat(notificationRepository.findByUserIdOrderByCreatedAtDesc(playerOutGroup.userId())).isEmpty();
    }
}