package com.sinte.backend.service;

import com.sinte.backend.domain.EmailQueue;
import com.sinte.backend.domain.Notification;
import com.sinte.backend.domain.enums.EmailStatus;
import com.sinte.backend.repository.EmailQueueRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmailQueueService {

    private final EmailQueueRepository emailQueueRepository;

    public EmailQueueService(EmailQueueRepository emailQueueRepository) {
        this.emailQueueRepository = emailQueueRepository;
    }

    @Transactional
    public EmailQueue enqueue(Notification notification, String toEmail, String subject, String htmlBody) {
        EmailQueue email = new EmailQueue(notification, toEmail, subject, htmlBody);
        return emailQueueRepository.save(email);
    }

    @Transactional(readOnly = true)
    public List<EmailQueue> getDueEmails(int batchSize) {
        return emailQueueRepository.findByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
                Set.of(EmailStatus.PENDING, EmailStatus.RETRYING),
                OffsetDateTime.now(),
                PageRequest.of(0, batchSize)
        );
    }

    @Transactional
    public void markSent(EmailQueue queueItem) {
        queueItem.markSent();
        emailQueueRepository.save(queueItem);
    }

    @Transactional
    public void markFailedOrRetry(EmailQueue queueItem, String errorMessage, int maxAttempts) {
        if (queueItem.getAttemptCount() + 1 >= maxAttempts) {
            queueItem.markFailed(errorMessage);
        } else {
            queueItem.markRetrying(errorMessage, OffsetDateTime.now().plusMinutes(2));
        }
        emailQueueRepository.save(queueItem);
    }

    @Transactional(readOnly = true)
    public List<EmailQueue> findAll() {
        return emailQueueRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public void retryNow(UUID emailQueueId) {
        EmailQueue queueItem = emailQueueRepository.findById(emailQueueId)
                .orElseThrow(() -> new DomainException("Registro de cola no encontrado"));
        queueItem.markRetrying("Retry manual solicitado", OffsetDateTime.now());
        emailQueueRepository.save(queueItem);
    }
}
