package com.sinte.backend.repository;

import com.sinte.backend.domain.EmailQueue;
import com.sinte.backend.domain.enums.EmailStatus;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailQueueRepository extends JpaRepository<EmailQueue, UUID> {
    List<EmailQueue> findByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
            Collection<EmailStatus> statuses,
            OffsetDateTime nextAttemptAt,
            Pageable pageable
    );

    List<EmailQueue> findAllByOrderByCreatedAtDesc();
}
