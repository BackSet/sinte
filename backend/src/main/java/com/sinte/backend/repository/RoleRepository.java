package com.sinte.backend.repository;

import com.sinte.backend.domain.Role;
import com.sinte.backend.domain.enums.RoleCode;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByCode(RoleCode code);
}
