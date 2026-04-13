package com.sinte.backend.service;

import com.sinte.backend.domain.EmailQueue;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmailQueueWorkerService {

    private static final int DEFAULT_BATCH_SIZE = 50;
    private static final int DEFAULT_MAX_ATTEMPTS = 5;

    private final EmailQueueService emailQueueService;
    private final EmailSender emailSender;

    public EmailQueueWorkerService(EmailQueueService emailQueueService, EmailSender emailSender) {
        this.emailQueueService = emailQueueService;
        this.emailSender = emailSender;
    }

    @Transactional
    public void processDueEmails() {
        List<EmailQueue> dueEmails = emailQueueService.getDueEmails(DEFAULT_BATCH_SIZE);
        for (EmailQueue email : dueEmails) {
            try {
                emailSender.send(email.getToEmail(), email.getSubject(), email.getBodyHtml());
                emailQueueService.markSent(email);
            } catch (Exception ex) {
                emailQueueService.markFailedOrRetry(email, ex.getMessage(), DEFAULT_MAX_ATTEMPTS);
            }
        }
    }
}
