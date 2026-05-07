package com.sinte.backend.service;

import com.sinte.backend.domain.SinteGroup;
import com.sinte.backend.domain.SinteGroupMember;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.enums.RoleCode;
import com.sinte.backend.repository.SinteGroupMemberRepository;
import com.sinte.backend.repository.SinteGroupRepository;
import com.sinte.backend.repository.UserRepository;
import com.sinte.backend.repository.UserRoleRepository;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GroupService {

    private final SinteGroupRepository sinteGroupRepository;
    private final SinteGroupMemberRepository sinteGroupMemberRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserHandleService userHandleService;

    public GroupService(
            SinteGroupRepository sinteGroupRepository,
            SinteGroupMemberRepository sinteGroupMemberRepository,
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            UserHandleService userHandleService
    ) {
        this.sinteGroupRepository = sinteGroupRepository;
        this.sinteGroupMemberRepository = sinteGroupMemberRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.userHandleService = userHandleService;
    }

    @Transactional
    public SinteGroup createGroup(UUID requesterUserId, String name) {
        User requester = requireUser(requesterUserId);
        String normalizedName = name == null ? "" : name.trim();
        if (normalizedName.isBlank()) {
            throw new DomainException("El nombre del grupo es obligatorio");
        }
        if (sinteGroupRepository.existsByNameIgnoreCase(normalizedName)) {
            throw new DomainException("Ya existe un grupo con ese nombre");
        }
        return sinteGroupRepository.save(new SinteGroup(normalizedName, requester));
    }

    @Transactional(readOnly = true)
    public List<SinteGroup> listGroups(UUID requesterUserId) {
        if (isAdmin(requesterUserId)) {
            return sinteGroupRepository.findAll();
        }
        return sinteGroupRepository.findByCreatedByIdOrderByCreatedAtDesc(requesterUserId);
    }

    @Transactional(readOnly = true)
    public List<SinteGroup> listMyGroups(UUID requesterUserId) {
        return sinteGroupMemberRepository.findDistinctActiveGroupsByUserId(requesterUserId);
    }

    @Transactional(readOnly = true)
    public List<SinteGroupMember> listMembersForGroups(UUID requesterUserId, List<UUID> groupIds) {
        if (groupIds == null || groupIds.isEmpty()) {
            return List.of();
        }
        List<SinteGroup> myGroups = listMyGroups(requesterUserId);
        List<UUID> myGroupIds = myGroups.stream().map(SinteGroup::getId).toList();
        boolean hasUnauthorizedGroup = groupIds.stream().anyMatch(groupId -> !myGroupIds.contains(groupId));
        if (hasUnauthorizedGroup) {
            throw new DomainException("No tienes permisos para ver miembros de ese grupo");
        }
        return sinteGroupMemberRepository.findByGroupIdInOrderByCreatedAtDesc(groupIds);
    }

    @Transactional
    public SinteGroup setActive(UUID requesterUserId, UUID groupId, boolean value) {
        SinteGroup group = requireGroupForRequester(requesterUserId, groupId, true);
        group.setActive(value);
        return sinteGroupRepository.save(group);
    }

    @Transactional
    public SinteGroupMember addMemberByHandle(UUID requesterUserId, UUID groupId, String handle) {
        SinteGroup group = requireGroupForRequester(requesterUserId, groupId, true);
        UserHandleService.HandleParts handleParts = userHandleService.parseHandle(handle);
        User user = userRepository.findByNicknameAndNicknameTag(handleParts.nickname(), handleParts.tag())
                .orElseThrow(() -> new DomainException("No existe un jugador con ese codigo"));

        if (!userRoleRepository.existsByUserIdAndRoleCode(user.getId(), RoleCode.PLAYER)) {
            throw new DomainException("El usuario no tiene rol PLAYER");
        }
        if (!user.isActive()) {
            throw new DomainException("El usuario esta inactivo");
        }
        if (sinteGroupMemberRepository.existsByGroupIdAndUserId(group.getId(), user.getId())) {
            throw new DomainException("El jugador ya pertenece al grupo");
        }
        return sinteGroupMemberRepository.save(new SinteGroupMember(group, user));
    }

    @Transactional
    public void removeMember(UUID requesterUserId, UUID groupId, UUID userId) {
        SinteGroup group = requireGroupForRequester(requesterUserId, groupId, true);
        int removed = sinteGroupMemberRepository.deleteByGroupIdAndUserId(group.getId(), userId);
        if (removed == 0) {
            throw new DomainException("El jugador no pertenece al grupo");
        }
    }

    @Transactional(readOnly = true)
    public List<SinteGroupMember> listMembers(UUID requesterUserId, UUID groupId) {
        SinteGroup group = requireGroupForRequester(requesterUserId, groupId, false);
        return sinteGroupMemberRepository.findByGroupIdOrderByCreatedAtDesc(group.getId());
    }

    @Transactional(readOnly = true)
    public List<SinteGroup> validateTargetGroupsForRequester(UUID requesterUserId, List<UUID> groupIds) {
        if (groupIds == null || groupIds.isEmpty()) {
            return List.of();
        }
        List<UUID> deduplicated = new ArrayList<>(new LinkedHashSet<>(groupIds));
        List<SinteGroup> groups = sinteGroupRepository.findAllById(deduplicated);
        if (groups.size() != deduplicated.size()) {
            throw new DomainException("Uno o mas grupos objetivo no existen");
        }

        boolean admin = isAdmin(requesterUserId);
        if (!admin) {
            boolean unauthorizedGroup = groups.stream()
                    .anyMatch(group -> !group.getCreatedBy().getId().equals(requesterUserId));
            if (unauthorizedGroup) {
                throw new DomainException("Solo puedes usar grupos creados por ti");
            }
        }
        boolean inactiveGroup = groups.stream().anyMatch(group -> !group.isActive());
        if (inactiveGroup) {
            throw new DomainException("No se puede usar un grupo inactivo");
        }
        return groups;
    }

    @Transactional(readOnly = true)
    public List<User> resolvePlayersForGroupIds(List<UUID> groupIds) {
        if (groupIds == null || groupIds.isEmpty()) {
            return List.of();
        }
        List<UUID> deduplicated = new ArrayList<>(new LinkedHashSet<>(groupIds));
        return sinteGroupMemberRepository.findDistinctActiveUsersByGroupIdsAndRoleCode(deduplicated, RoleCode.PLAYER);
    }

    private SinteGroup requireGroupForRequester(UUID requesterUserId, UUID groupId, boolean writeAction) {
        SinteGroup group = sinteGroupRepository.findById(groupId)
                .orElseThrow(() -> new DomainException("Grupo no encontrado"));
        boolean admin = isAdmin(requesterUserId);
        boolean owner = group.getCreatedBy().getId().equals(requesterUserId);
        if (!admin && !owner) {
            throw new DomainException(writeAction
                    ? "No tienes permisos para modificar este grupo"
                    : "No tienes permisos para ver este grupo");
        }
        return group;
    }

    private boolean isAdmin(UUID userId) {
        return userRoleRepository.existsByUserIdAndRoleCode(userId, RoleCode.ADMIN);
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new DomainException("Usuario no encontrado"));
    }
}
