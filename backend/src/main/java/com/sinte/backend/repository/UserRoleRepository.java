package com.sinte.backend.repository;

import com.sinte.backend.domain.User;
import com.sinte.backend.domain.UserRole;
import com.sinte.backend.domain.enums.RoleCode;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

    @Query("""
           SELECT COUNT(ur) > 0
           FROM UserRole ur
           WHERE ur.user.id = :userId
             AND ur.role.code = :roleCode
           """)
    boolean existsByUserIdAndRoleCode(@Param("userId") UUID userId, @Param("roleCode") RoleCode roleCode);

    @Query("""
           SELECT ur.user
           FROM UserRole ur
           WHERE ur.role.code = :roleCode
             AND ur.user.active = true
           """)
    List<User> findActiveUsersByRoleCode(@Param("roleCode") RoleCode roleCode);

    @Query("""
           SELECT ur.role.code
           FROM UserRole ur
           WHERE ur.user.id = :userId
           """)
    List<RoleCode> findRoleCodesByUserId(@Param("userId") UUID userId);

    @Modifying
    @Query("""
           DELETE FROM UserRole ur
           WHERE ur.user.id = :userId
             AND ur.role.code = :roleCode
           """)
    int deleteByUserIdAndRoleCode(@Param("userId") UUID userId, @Param("roleCode") RoleCode roleCode);
}
