package com.sinte.backend.service;

import com.sinte.backend.domain.User;
import com.sinte.backend.repository.UserRepository;
import java.security.SecureRandom;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class UserHandleService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern HANDLE_PATTERN = Pattern.compile("^[A-Za-z0-9_]{3,20}#[A-Za-z0-9]{4}$");
    private static final Pattern HANDLE_BASE_PATTERN = Pattern.compile("^[a-z0-9_]{3,20}$");
    private static final Pattern TAG_PATTERN = Pattern.compile("^[A-Z0-9]{4}$");
    private static final String TAG_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private final UserRepository userRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public UserHandleService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public String normalizeEmail(String email) {
        if (email == null) {
            throw new DomainException("El correo es obligatorio");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public boolean looksLikeEmail(String identifier) {
        return identifier != null && EMAIL_PATTERN.matcher(identifier.trim()).matches();
    }

    public HandleParts parseHandle(String handle) {
        if (handle == null) {
            throw new DomainException("El identificador es obligatorio");
        }
        String normalizedHandle = handle.trim();
        if (!HANDLE_PATTERN.matcher(normalizedHandle).matches()) {
            throw new DomainException("El nick debe tener formato nick#AB12");
        }
        int separatorIndex = normalizedHandle.lastIndexOf('#');
        String nickname = normalizedHandle.substring(0, separatorIndex).toLowerCase(Locale.ROOT);
        String tag = normalizedHandle.substring(separatorIndex + 1).toUpperCase(Locale.ROOT);
        return new HandleParts(nickname, tag);
    }

    public void ensureHandle(User user, UUID excludeUserId) {
        String nicknameBase = normalizeNickname(user.getNickname());
        user.setNickname(nicknameBase);

        String normalizedTag = normalizeTag(user.getNicknameTag());
        if (normalizedTag != null && !userRepository.existsByNicknameAndNicknameTag(nicknameBase, normalizedTag, excludeUserId)) {
            user.setNicknameTag(normalizedTag);
            return;
        }

        user.setNicknameTag(generateUniqueTag(nicknameBase, excludeUserId));
    }

    public String buildHandle(String nickname, String nicknameTag) {
        if (nickname == null || nicknameTag == null) {
            return null;
        }
        return nickname + "#" + nicknameTag;
    }

    private String normalizeNickname(String nickname) {
        String base = nickname == null ? "" : nickname.trim().toLowerCase(Locale.ROOT);
        base = base.replaceAll("[^a-z0-9_]", "");
        if (base.length() < 3) {
            base = "player";
        }
        if (base.length() > 20) {
            base = base.substring(0, 20);
        }
        if (!HANDLE_BASE_PATTERN.matcher(base).matches()) {
            throw new DomainException("El nickname solo admite letras, numeros y guion bajo (3-20)");
        }
        return base;
    }

    private String normalizeTag(String tag) {
        if (tag == null || tag.isBlank()) {
            return null;
        }
        String normalized = tag.trim().toUpperCase(Locale.ROOT);
        if (!TAG_PATTERN.matcher(normalized).matches()) {
            throw new DomainException("El tag debe tener 4 caracteres alfanumericos");
        }
        return normalized;
    }

    private String generateUniqueTag(String nickname, UUID excludeUserId) {
        for (int attempt = 0; attempt < 200; attempt++) {
            String candidate = randomTag();
            if (!userRepository.existsByNicknameAndNicknameTag(nickname, candidate, excludeUserId)) {
                return candidate;
            }
        }
        throw new DomainException("No se pudo generar un tag unico para el usuario");
    }

    private String randomTag() {
        StringBuilder builder = new StringBuilder(4);
        for (int index = 0; index < 4; index++) {
            builder.append(TAG_CHARS.charAt(secureRandom.nextInt(TAG_CHARS.length())));
        }
        return builder.toString();
    }

    public record HandleParts(String nickname, String tag) {
    }
}
