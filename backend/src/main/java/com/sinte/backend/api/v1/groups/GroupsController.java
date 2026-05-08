package com.sinte.backend.api.v1.groups;

import com.sinte.backend.config.security.SecurityUtils;
import com.sinte.backend.domain.SinteGroup;
import com.sinte.backend.domain.SinteGroupMember;
import com.sinte.backend.service.GroupService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/groups")
public class GroupsController {

    private final GroupService groupService;

    public GroupsController(GroupService groupService) {
        this.groupService = groupService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<List<GroupResponse>> list() {
        UUID userId = SecurityUtils.currentUserId();
        List<GroupResponse> groups = groupService.listGroups(userId).stream()
                .map(group -> new GroupResponse(
                        group.getId(),
                        group.getName(),
                        group.getCreatedBy().getId(),
                        group.isActive(),
                        group.getCreatedAt()
                ))
                .toList();
        return ResponseEntity.ok(groups);
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('PLAYER','DT','ADMIN')")
    public ResponseEntity<List<MyGroupResponse>> listMyGroups() {
        UUID userId = SecurityUtils.currentUserId();
        List<SinteGroup> groups = groupService.listMyGroups(userId);
        List<UUID> groupIds = groups.stream().map(SinteGroup::getId).toList();
        List<SinteGroupMember> memberships = groupService.listMembersForGroups(userId, groupIds);

        List<MyGroupResponse> response = groups.stream()
                .map(group -> new MyGroupResponse(
                        group.getId(),
                        group.getName(),
                        group.getCreatedBy().getId(),
                        group.isActive(),
                        memberships.stream()
                                .filter(member -> member.getGroup().getId().equals(group.getId()))
                                .map(this::toMemberResponse)
                                .toList()
                ))
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<GroupResponse> create(@Valid @RequestBody CreateGroupRequest request) {
        SinteGroup group = groupService.createGroup(SecurityUtils.currentUserId(), request.name());
        return ResponseEntity.ok(new GroupResponse(
                group.getId(),
                group.getName(),
                group.getCreatedBy().getId(),
                group.isActive(),
                group.getCreatedAt()
        ));
    }

    @PatchMapping("/{groupId}/active")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<GroupResponse> setActive(@PathVariable UUID groupId, @RequestParam boolean value) {
        SinteGroup group = groupService.setActive(SecurityUtils.currentUserId(), groupId, value);
        return ResponseEntity.ok(new GroupResponse(
                group.getId(),
                group.getName(),
                group.getCreatedBy().getId(),
                group.isActive(),
                group.getCreatedAt()
        ));
    }

    @GetMapping("/{groupId}/members")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<List<GroupMemberResponse>> listMembers(@PathVariable UUID groupId) {
        List<GroupMemberResponse> members = groupService.listMembers(SecurityUtils.currentUserId(), groupId).stream()
                .map(this::toMemberResponse)
                .toList();
        return ResponseEntity.ok(members);
    }

    @PostMapping("/{groupId}/members")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<GroupMemberResponse> addMember(
            @PathVariable UUID groupId,
            @Valid @RequestBody AddMemberRequest request
    ) {
        SinteGroupMember member = groupService.addMemberByHandle(SecurityUtils.currentUserId(), groupId, request.playerHandle(), request.rol());
        return ResponseEntity.ok(toMemberResponse(member));
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    @PreAuthorize("hasAnyRole('DT','ADMIN')")
    public ResponseEntity<Void> removeMember(@PathVariable UUID groupId, @PathVariable UUID userId) {
        groupService.removeMember(SecurityUtils.currentUserId(), groupId, userId);
        return ResponseEntity.noContent().build();
    }

    private GroupMemberResponse toMemberResponse(SinteGroupMember member) {
        return new GroupMemberResponse(
                member.getUser().getId(),
                member.getUser().getFullName(),
                member.getUser().getEmail(),
                member.getUser().getNickname(),
                member.getUser().getNicknameTag(),
                member.getUser().getPlayerHandle(),
                member.getRol(),
                member.getCreatedAt()
        );
    }

    public record CreateGroupRequest(
            @NotBlank @Size(max = 120) String name
    ) {
    }

    public record AddMemberRequest(
            @NotBlank String playerHandle,
            String rol
    ) {
    }

    public record GroupResponse(
            UUID id,
            String name,
            UUID createdByUserId,
            boolean active,
            OffsetDateTime createdAt
    ) {
    }

    public record GroupMemberResponse(
            @NotNull UUID userId,
            String fullName,
            String email,
            String nickname,
            String nicknameTag,
            String playerHandle,
            String rol,
            OffsetDateTime addedAt
    ) {
    }

    public record MyGroupResponse(
            UUID id,
            String name,
            UUID createdByUserId,
            boolean active,
            List<GroupMemberResponse> members
    ) {
    }
}
