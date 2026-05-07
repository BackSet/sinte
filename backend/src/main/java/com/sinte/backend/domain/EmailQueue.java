package com.sinte.backend.domain;

import com.sinte.backend.domain.enums.EmailStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "email_queue")
public class EmailQueue {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "to_email", nullable = false, length = 180)
    private String toEmail;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(name = "body_html", nullable = false, columnDefinition = "TEXT")
    private String bodyHtml;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EmailStatus status = EmailStatus.PENDING;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 0;

    @Column(name = "next_attempt_at", nullable = false)
    private OffsetDateTime nextAttemptAt;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;

    protected EmailQueue() {
    }

    public EmailQueue(String toEmail, String subject, String bodyHtml) {
        this.toEmail = toEmail;
        this.subject = subject;
        this.bodyHtml = bodyHtml;
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.nextAttemptAt = now;
    }

    public UUID getId() {
        return id;
    }

    public String getToEmail() {
        return toEmail;
    }

    public String getSubject() {
        return subject;
    }

    public String getBodyHtml() {
        return bodyHtml;
    }

    public EmailStatus getStatus() {
        return status;
    }

    public int getAttemptCount() {
        return attemptCount;
    }

    public OffsetDateTime getNextAttemptAt() {
        return nextAttemptAt;
    }

    public String getLastError() {
        return lastError;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getSentAt() {
        return sentAt;
    }

    public void markSent() {
        this.status = EmailStatus.SENT;
        this.sentAt = OffsetDateTime.now();
        this.lastError = null;
    }

    public void markRetrying(String errorMessage, OffsetDateTime nextAttemptAt) {
        this.status = EmailStatus.RETRYING;
        this.attemptCount++;
        this.lastError = errorMessage;
        this.nextAttemptAt = nextAttemptAt;
    }

    public void markFailed(String errorMessage) {
        this.status = EmailStatus.FAILED;
        this.attemptCount++;
        this.lastError = errorMessage;
    }
}