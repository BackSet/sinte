package com.sinte.backend.repository;

import com.sinte.backend.domain.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);

    @Query("""
           SELECT u
           FROM User u
           WHERE lower(u.nickname) = lower(:nickname)
             AND upper(u.nicknameTag) = upper(:nicknameTag)
           """)
    Optional<User> findByNicknameAndNicknameTag(@Param("nickname") String nickname, @Param("nicknameTag") String nicknameTag);

    @Query("""
           SELECT COUNT(u) > 0
           FROM User u
           WHERE lower(u.nickname) = lower(:nickname)
             AND upper(u.nicknameTag) = upper(:nicknameTag)
             AND (:excludeUserId IS NULL OR u.id <> :excludeUserId)
           """)
    boolean existsByNicknameAndNicknameTag(
            @Param("nickname") String nickname,
            @Param("nicknameTag") String nicknameTag,
            @Param("excludeUserId") UUID excludeUserId
    );
}
