package com.sinte.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LoggingEmailSender implements EmailSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingEmailSender.class);

    @Override
    public void send(String toEmail, String subject, String htmlBody) {
        LOGGER.info("Email mock -> to={}, subject={}", toEmail, subject);
    }
}
