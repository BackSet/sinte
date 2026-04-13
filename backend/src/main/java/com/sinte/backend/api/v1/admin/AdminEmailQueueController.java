package com.sinte.backend.api.v1.admin;

import com.sinte.backend.domain.EmailQueue;
import com.sinte.backend.service.EmailQueueService;
import com.sinte.backend.service.EmailQueueWorkerService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/email-queue")
@PreAuthorize("hasRole('ADMIN')")
public class AdminEmailQueueController {

    private final EmailQueueService emailQueueService;
    private final EmailQueueWorkerService emailQueueWorkerService;

    public AdminEmailQueueController(EmailQueueService emailQueueService, EmailQueueWorkerService emailQueueWorkerService) {
        this.emailQueueService = emailQueueService;
        this.emailQueueWorkerService = emailQueueWorkerService;
    }

    @GetMapping
    public ResponseEntity<List<EmailQueueResponse>> list() {
        return ResponseEntity.ok(emailQueueService.findAll().stream().map(this::toResponse).toList());
    }

    @PostMapping("/{emailQueueId}/retry")
    public ResponseEntity<Void> retryNow(@PathVariable UUID emailQueueId) {
        emailQueueService.retryNow(emailQueueId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/process-due")
    public ResponseEntity<Void> processDue() {
        emailQueueWorkerService.processDueEmails();
        return ResponseEntity.accepted().build();
    }

    private EmailQueueResponse toResponse(EmailQueue entity) {
        return new EmailQueueResponse(
                entity.getId(),
                entity.getToEmail(),
                entity.getSubject(),
                entity.getStatus().name(),
                entity.getAttemptCount(),
                entity.getNextAttemptAt(),
                entity.getLastError(),
                entity.getCreatedAt(),
                entity.getSentAt()
        );
    }

    public record EmailQueueResponse(
            UUID id,
            String toEmail,
            String subject,
            String status,
            int attemptCount,
            OffsetDateTime nextAttemptAt,
            String lastError,
            OffsetDateTime createdAt,
            OffsetDateTime sentAt
    ) {
    }
}
