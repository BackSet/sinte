package com.sinte.backend.service;

import com.sinte.backend.domain.GuestPlayer;
import com.sinte.backend.domain.GuestPlayerPosition;
import com.sinte.backend.domain.Match;
import com.sinte.backend.domain.MatchAttendance;
import com.sinte.backend.domain.MatchPair;
import com.sinte.backend.domain.MatchTeam;
import com.sinte.backend.domain.MatchTeamPlayer;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.UserPosition;
import com.sinte.backend.domain.enums.AttendanceStatus;
import com.sinte.backend.repository.GuestPlayerPositionRepository;
import com.sinte.backend.repository.GuestPlayerRepository;
import com.sinte.backend.repository.MatchAttendanceRepository;
import com.sinte.backend.repository.MatchPairRepository;
import com.sinte.backend.repository.MatchTeamPlayerRepository;
import com.sinte.backend.repository.MatchTeamRepository;
import com.sinte.backend.repository.MatchRepository;
import com.sinte.backend.repository.UserPositionRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchPairingService {

    private final MatchAttendanceRepository matchAttendanceRepository;
    private final GuestPlayerRepository guestPlayerRepository;
    private final UserPositionRepository userPositionRepository;
    private final GuestPlayerPositionRepository guestPlayerPositionRepository;
    private final MatchPairRepository matchPairRepository;
    private final MatchTeamRepository matchTeamRepository;
    private final MatchTeamPlayerRepository matchTeamPlayerRepository;
    private final MatchRepository matchRepository;

    public MatchPairingService(
            MatchAttendanceRepository matchAttendanceRepository,
            GuestPlayerRepository guestPlayerRepository,
            UserPositionRepository userPositionRepository,
            GuestPlayerPositionRepository guestPlayerPositionRepository,
            MatchPairRepository matchPairRepository,
            MatchTeamRepository matchTeamRepository,
            MatchTeamPlayerRepository matchTeamPlayerRepository,
            MatchRepository matchRepository
    ) {
        this.matchAttendanceRepository = matchAttendanceRepository;
        this.guestPlayerRepository = guestPlayerRepository;
        this.userPositionRepository = userPositionRepository;
        this.guestPlayerPositionRepository = guestPlayerPositionRepository;
        this.matchPairRepository = matchPairRepository;
        this.matchTeamRepository = matchTeamRepository;
        this.matchTeamPlayerRepository = matchTeamPlayerRepository;
        this.matchRepository = matchRepository;
    }

    public record PairingResult(
            List<PairView> pairs,
            List<PairingPlayer> unpaired,
            boolean cupReached,
            int totalConfirmed
    ) {}

    public record PairView(
            UUID id,
            String positionCode,
            PairingPlayer playerA,
            PairingPlayer playerB
    ) {}

    public record PairingPlayer(
            UUID userId,
            UUID guestPlayerId,
            String fullName,
            String playerHandle,
            String primaryPositionCode,
            String secondaryPositionCode,
            boolean isPrimary
    ) {}

    @Transactional(readOnly = true)
    public PairingResult previewPairs(UUID matchId) {
        MatchMatchups matchups = loadMatchups(matchId);
        List<PairingPlayer> allPlayers = new ArrayList<>(matchups.users);
        allPlayers.addAll(matchups.guests);

        List<PairView> pairs = buildPairs(matchups, allPlayers);
        List<PairingPlayer> unpaired = allPlayers.stream()
                .filter(p -> pairs.stream().noneMatch(pair ->
                        (pair.playerA().userId() != null && pair.playerA().userId().equals(p.userId())) ||
                        (pair.playerA().guestPlayerId() != null && pair.playerA().guestPlayerId().equals(p.guestPlayerId())) ||
                        (pair.playerB().userId() != null && pair.playerB().userId().equals(p.userId())) ||
                        (pair.playerB().guestPlayerId() != null && pair.playerB().guestPlayerId().equals(p.guestPlayerId()))
                ))
                .toList();

        int targetPlayers = matchups.targetPlayers != null ? matchups.targetPlayers : Integer.MAX_VALUE;
        boolean cupReached = allPlayers.size() >= targetPlayers;
        return new PairingResult(pairs, unpaired, cupReached, allPlayers.size());
    }

    @Transactional
    public PairingResult executePairing(UUID matchId, UUID requesterUserId) {
        MatchMatchups matchups = loadMatchups(matchId);
        List<PairingPlayer> allPlayers = new ArrayList<>(matchups.users);
        allPlayers.addAll(matchups.guests);

        List<MatchPair> createdPairs = new ArrayList<>();
        List<PairView> pairViews = new ArrayList<>();

        Map<UUID, String> userPrimaryPosition = new HashMap<>();
        Map<UUID, String> userSecondaryPosition = new HashMap<>();
        Map<UUID, String> guestPrimaryPosition = new HashMap<>();
        Map<UUID, String> guestSecondaryPosition = new HashMap<>();

        for (PairingPlayer p : matchups.users) {
            userPrimaryPosition.put(p.userId, p.primaryPositionCode);
            userSecondaryPosition.put(p.userId, p.secondaryPositionCode);
        }
        for (PairingPlayer p : matchups.guests) {
            guestPrimaryPosition.put(p.guestPlayerId, p.primaryPositionCode);
            guestSecondaryPosition.put(p.guestPlayerId, p.secondaryPositionCode);
        }

        List<PairingPlayer> primaryGrouped = new ArrayList<>(allPlayers);
        Collections.sort(primaryGrouped, (a, b) -> {
            String posA = getPrimaryPositionCode(a);
            String posB = getPrimaryPositionCode(b);
            return posA.compareTo(posB);
        });

        Map<String, List<PairingPlayer>> byPosition = new HashMap<>();
        for (PairingPlayer p : primaryGrouped) {
            String pos = getPrimaryPositionCode(p);
            byPosition.computeIfAbsent(pos, k -> new ArrayList<>()).add(p);
        }

        List<PairingPlayer> used = new ArrayList<>();
        List<PairingPlayer> unmatched = new ArrayList<>();

        for (Map.Entry<String, List<PairingPlayer>> entry : byPosition.entrySet()) {
            List<PairingPlayer> group = entry.getValue();
            for (int i = 0; i + 1 < group.size(); i += 2) {
                PairingPlayer a = group.get(i);
                PairingPlayer b = group.get(i + 1);
                MatchPair pair = new MatchPair(
                        matchups.match,
                        a.userId != null ? matchups.userMap.get(a.userId) : null,
                        b.userId != null ? matchups.userMap.get(b.userId) : null,
                        a.guestPlayerId != null ? matchups.guestMap.get(a.guestPlayerId) : null,
                        b.guestPlayerId != null ? matchups.guestMap.get(b.guestPlayerId) : null,
                        entry.getKey()
                );
                createdPairs.add(matchPairRepository.save(pair));
                used.add(a);
                used.add(b);
            }
            if (group.size() % 2 != 0) {
                unmatched.add(group.get(group.size() - 1));
            }
        }

        for (PairingPlayer p : unmatched) {
            String secondary = getSecondaryPositionCode(p);
            if (secondary != null) {
                List<PairingPlayer> candidates = new ArrayList<>();
                for (PairingPlayer other : unmatched) {
                    if (!other.equals(p) && !used.contains(other) && getPrimaryPositionCode(other).equals(secondary)) {
                        candidates.add(other);
                    }
                }
                if (!candidates.isEmpty()) {
                    PairingPlayer b = candidates.get(0);
                    MatchPair pair = new MatchPair(
                            matchups.match,
                            p.userId != null ? matchups.userMap.get(p.userId) : null,
                            b.userId != null ? matchups.userMap.get(b.userId) : null,
                            p.guestPlayerId != null ? matchups.guestMap.get(p.guestPlayerId) : null,
                            b.guestPlayerId != null ? matchups.guestMap.get(b.guestPlayerId) : null,
                            secondary
                    );
                    createdPairs.add(matchPairRepository.save(pair));
                    used.add(p);
                    used.add(b);
                }
            }
        }

        for (MatchPair pair : createdPairs) {
            pairViews.add(new PairView(
                    pair.getId(),
                    pair.getPositionCode(),
                    toPairingPlayer(pair.getPlayerA(), pair.getGuestPlayerA(), pair.getPositionCode(), userPrimaryPosition, guestPrimaryPosition),
                    toPairingPlayer(pair.getPlayerB(), pair.getGuestPlayerB(), pair.getPositionCode(), userPrimaryPosition, guestPrimaryPosition)
            ));
        }

        for (PairingPlayer p : allPlayers) {
            if (used.stream().noneMatch(u -> u.userId() != null && u.userId().equals(p.userId()) ||
                    u.guestPlayerId() != null && u.guestPlayerId().equals(p.guestPlayerId()))) {
                used.add(p);
            }
        }
        List<PairingPlayer> unpairedList = allPlayers.stream()
                .filter(p -> used.stream().noneMatch(u ->
                        (u.userId() != null && u.userId().equals(p.userId())) ||
                        (u.guestPlayerId() != null && u.guestPlayerId().equals(p.guestPlayerId()))
                ))
                .toList();

        int targetPlayers = matchups.targetPlayers != null ? matchups.targetPlayers : Integer.MAX_VALUE;
        boolean cupReached = allPlayers.size() >= targetPlayers;

        return new PairingResult(pairViews, unpairedList, cupReached, allPlayers.size());
    }

    @Transactional
    public List<TeamAssignmentResult> executeDrawAndAssignTeams(UUID matchId) {
        List<MatchPair> pairs = matchPairRepository.findByMatchIdOrderByCreatedAtAsc(matchId);
        if (pairs.isEmpty()) {
            throw new DomainException("No hay parejas generadas para este partido");
        }

        matchTeamPlayerRepository.deleteByMatchId(matchId);
        matchTeamRepository.deleteByMatchId(matchId);

        MatchTeam teamA = matchTeamRepository.save(new MatchTeam(null, 1, "Equipo A"));
        MatchTeam teamB = matchTeamRepository.save(new MatchTeam(null, 2, "Equipo B"));

        List<TeamAssignmentResult> results = new ArrayList<>();

        for (MatchPair pair : pairs) {
            List<User> users = new ArrayList<>();
            List<GuestPlayer> guests = new ArrayList<>();
            if (pair.getPlayerA() != null) users.add(pair.getPlayerA());
            if (pair.getPlayerB() != null) users.add(pair.getPlayerB());
            if (pair.getGuestPlayerA() != null) guests.add(pair.getGuestPlayerA());
            if (pair.getGuestPlayerB() != null) guests.add(pair.getGuestPlayerB());

            List<Object> allMembers = new ArrayList<>();
            allMembers.addAll(users);
            allMembers.addAll(guests);
            Collections.shuffle(allMembers);

            Object first = allMembers.get(0);
            Object second = allMembers.size() > 1 ? allMembers.get(1) : null;

            MatchTeamPlayer playerA;
            MatchTeamPlayer playerB;

            if (first instanceof User u) {
                playerA = new MatchTeamPlayer(teamA, u, pair);
            } else {
                playerA = new MatchTeamPlayer(teamA, (GuestPlayer) first, pair);
            }
            matchTeamPlayerRepository.save(playerA);

            if (second != null) {
                if (second instanceof User u) {
                    playerB = new MatchTeamPlayer(teamB, u, pair);
                } else {
                    playerB = new MatchTeamPlayer(teamB, (GuestPlayer) second, pair);
                }
                matchTeamPlayerRepository.save(playerB);
            } else {
                if (first instanceof User u) {
                    playerB = new MatchTeamPlayer(teamB, u, pair);
                } else {
                    playerB = new MatchTeamPlayer(teamB, (GuestPlayer) first, pair);
                }
                matchTeamPlayerRepository.save(playerB);
            }

            results.add(new TeamAssignmentResult(
                    pair.getId(),
                    pair.getPositionCode(),
                    teamA.getId(),
                    teamB.getId(),
                    playerA.getId(),
                    playerB != null ? playerB.getId() : null
            ));
        }

        return results;
    }

    @Transactional
    public void resetPairsAndTeams(UUID matchId) {
        matchPairRepository.deleteByMatchId(matchId);
        matchTeamPlayerRepository.deleteByMatchId(matchId);
        matchTeamRepository.deleteByMatchId(matchId);
    }

    private MatchMatchups loadMatchups(UUID matchId) {
        List<MatchAttendance> attendances = matchAttendanceRepository.findByMatchIdAndStatusOrderByRespondedAtAsc(matchId, AttendanceStatus.YES);
        if (attendances.isEmpty()) {
            throw new DomainException("No hay asistentes confirmados");
        }
        Match match = attendances.get(0).getMatch();

        List<User> confirmedUsers = attendances.stream()
                .map(ma -> ma.getUser())
                .toList();

        List<GuestPlayer> confirmedGuests = guestPlayerRepository
                .findByMatchIdAndStatusOrderByRespondedAtAsc(matchId, "YES");

        Map<UUID, User> userMap = new HashMap<>();
        confirmedUsers.forEach(u -> userMap.put(u.getId(), u));
        Map<UUID, GuestPlayer> guestMap = new HashMap<>();
        confirmedGuests.forEach(g -> guestMap.put(g.getId(), g));

        List<UUID> userIds = confirmedUsers.stream().map(User::getId).toList();
        List<UUID> guestIds = confirmedGuests.stream().map(GuestPlayer::getId).toList();

        Map<UUID, String> userPrimary = new HashMap<>();
        Map<UUID, String> userSecondary = new HashMap<>();
        if (!userIds.isEmpty()) {
            List<UserPosition> upList = userPositionRepository.findByUserIdInOrderByPriority(userIds);
            Map<UUID, List<UserPosition>> byUser = upList.stream()
                    .collect(Collectors.groupingBy(up -> up.getUser().getId()));
            for (UUID uid : userIds) {
                List<UserPosition> ups = byUser.get(uid);
                if (ups != null && !ups.isEmpty()) {
                    userPrimary.put(uid, ups.stream().filter(UserPosition::isPrimary).findFirst().orElse(ups.get(0)).getPositionCode());
                    userSecondary.put(uid, ups.size() > 1 ? ups.stream().filter(u -> !u.isPrimary()).findFirst().map(UserPosition::getPositionCode).orElse(null) : null);
                }
            }
        }

        Map<UUID, String> guestPrimary = new HashMap<>();
        Map<UUID, String> guestSecondary = new HashMap<>();
        if (!guestIds.isEmpty()) {
            List<GuestPlayerPosition> gpList = guestPlayerPositionRepository.findByGuestPlayerIdInOrderByPriority(guestIds);
            Map<UUID, List<GuestPlayerPosition>> byGuest = gpList.stream()
                    .collect(Collectors.groupingBy(gp -> gp.getGuestPlayer().getId()));
            for (UUID gid : guestIds) {
                List<GuestPlayerPosition> gps = byGuest.get(gid);
                if (gps != null && !gps.isEmpty()) {
                    guestPrimary.put(gid, gps.stream().filter(GuestPlayerPosition::isPrimary).findFirst().orElse(gps.get(0)).getPositionCode());
                    guestSecondary.put(gid, gps.size() > 1 ? gps.stream().filter(g -> !g.isPrimary()).findFirst().map(GuestPlayerPosition::getPositionCode).orElse(null) : null);
                }
            }
        }

        List<PairingPlayer> pairingUsers = confirmedUsers.stream()
                .map(u -> new PairingPlayer(
                        u.getId(), null, u.getFullName(), u.getPlayerHandle(),
                        userPrimary.getOrDefault(u.getId(), "SIN_POSICION"),
                        userSecondary.getOrDefault(u.getId(), null), true))
                .toList();

        List<PairingPlayer> pairingGuests = confirmedGuests.stream()
                .map(g -> {
                    String handle = g.getNickname() != null ? g.getNickname() : g.getFullName();
                    if (g.getShirtNumber() != null) handle += "#" + g.getShirtNumber();
                    return new PairingPlayer(
                            null, g.getId(), g.getFullName(), handle,
                            guestPrimary.getOrDefault(g.getId(), "SIN_POSICION"),
                            guestSecondary.getOrDefault(g.getId(), null), true);
                })
                .toList();

        return new MatchMatchups(match, match.getTargetPlayers(), userMap, guestMap, pairingUsers, pairingGuests);
    }

    private List<PairView> buildPairs(MatchMatchups matchups, List<PairingPlayer> allPlayers) {
        return List.of();
    }

    private String getPrimaryPositionCode(PairingPlayer p) {
        return p.primaryPositionCode();
    }

    private String getSecondaryPositionCode(PairingPlayer p) {
        return p.secondaryPositionCode();
    }

    private PairingPlayer toPairingPlayer(User user, GuestPlayer guest, String positionCode, Map<UUID, String> userPrimary, Map<UUID, String> guestPrimary) {
        if (user != null) {
            return new PairingPlayer(user.getId(), null, user.getFullName(), user.getPlayerHandle(), positionCode, null, true);
        }
        if (guest != null) {
            String handle = guest.getNickname();
            if (guest.getShirtNumber() != null) handle += "#" + guest.getShirtNumber();
            return new PairingPlayer(null, guest.getId(), guest.getFullName(), handle, positionCode, null, true);
        }
        return new PairingPlayer(null, null, null, null, positionCode, null, true);
    }

    private record MatchMatchups(
            Match match,
            Integer targetPlayers,
            Map<UUID, User> userMap,
            Map<UUID, GuestPlayer> guestMap,
            List<PairingPlayer> users,
            List<PairingPlayer> guests
    ) {}

    public record TeamAssignmentResult(
            UUID pairId,
            String positionCode,
            UUID teamAId,
            UUID teamBId,
            UUID playerAId,
            UUID playerBId
    ) {}
}