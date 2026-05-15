package com.sinte.backend.repository;

import com.sinte.backend.domain.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByPhone(String phone);

    @Query("""
           SELECT u
           FROM User u
           WHERE lower(u.nickname) = lower(:nickname)
             AND upper(u.nicknameTag) = upper(:nicknameTag)
           """)
    Optional<User> findByNicknameAndNicknameTag(@Param("nickname") String nickname, @Param("nicknameTag") String nicknameTag);

    @Query("""
           SELECT u
           FROM User u
           JOIN UserRole ur ON ur.user.id = u.id
           JOIN Role r ON r.id = ur.role.id
           WHERE r.code = :roleCode
           ORDER BY u.createdAt DESC
           """)
    List<User> findByRole(@Param("roleCode") String roleCode);

    boolean existsByNicknameAndNicknameTag(
            @Param("nickname") String nickname,
            @Param("nicknameTag") String nicknameTag,
            @Param("excludeUserId") UUID excludeUserId
    );
}
