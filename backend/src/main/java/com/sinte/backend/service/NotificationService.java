package com.sinte.backend.service;

import com.sinte.backend.domain.Notification;
import com.sinte.backend.domain.User;
import com.sinte.backend.domain.enums.NotificationType;
import com.sinte.backend.repository.NotificationRepository;
import com.sinte.backend.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailQueueService emailQueueService;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            EmailQueueService emailQueueService
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.emailQueueService = emailQueueService;
    }

    @Transactional
    public Notification notifyUser(UUID userId, NotificationType type, String title, String body) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new DomainException("Usuario no encontrado"));

        Notification notification = notificationRepository.save(new Notification(user, type, title, body));
        emailQueueService.enqueue(user.getEmail(), title, body);
        return notification;
    }

    @Transactional(readOnly = true)
    public List<Notification> getUnreadNotifications(UUID userId) {
        return notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<Notification> getAllNotifications(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public void markRead(UUID userId, UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new DomainException("Notificacion no encontrada"));
        if (!notification.getUser().getId().equals(userId)) {
            throw new DomainException("No puedes modificar una notificacion de otro usuario");
        }
        notification.markRead();
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllRead(UUID userId) {
        List<Notification> notifications = notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
        notifications.forEach(Notification::markRead);
        notificationRepository.saveAll(notifications);
    }
}
