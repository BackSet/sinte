package com.sinte.backend.repository;

import com.sinte.backend.domain.SinteGroupMember;
import com.sinte.backend.domain.SinteGroup;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.enums.RoleCode;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SinteGroupMemberRepository extends JpaRepository<SinteGroupMember, UUID> {
    boolean existsByGroupIdAndUserId(UUID groupId, UUID userId);

    List<SinteGroupMember> findByGroupIdOrderByCreatedAtDesc(UUID groupId);

    int deleteByGroupIdAndUserId(UUID groupId, UUID userId);

    @Query("""
           SELECT DISTINCT gm.group
           FROM SinteGroupMember gm
           WHERE gm.user.id = :userId
             AND gm.group.active = true
           ORDER BY gm.group.createdAt DESC
           """)
    List<SinteGroup> findDistinctActiveGroupsByUserId(@Param("userId") UUID userId);

    List<SinteGroupMember> findByGroupIdInOrderByCreatedAtDesc(List<UUID> groupIds);

    @Query("""
           SELECT DISTINCT gm.user
           FROM SinteGroupMember gm
           WHERE gm.group.id IN :groupIds
             AND gm.user.active = true
             AND EXISTS (
                 SELECT 1
                 FROM UserRole ur
                 WHERE ur.user.id = gm.user.id
                   AND ur.role.code = :roleCode
             )
           """)
    List<User> findDistinctActiveUsersByGroupIdsAndRoleCode(
            @Param("groupIds") List<UUID> groupIds,
            @Param("roleCode") RoleCode roleCode
    );
}
