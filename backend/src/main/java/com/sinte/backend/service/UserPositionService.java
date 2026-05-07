package com.sinte.backend.service;

import com.sinte.backend.domain.User;
import com.sinte.backend.domain.UserPosition;
import com.sinte.backend.repository.PositionRepository;
import com.sinte.backend.repository.UserPositionRepository;
import com.sinte.backend.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserPositionService {

    private final UserPositionRepository userPositionRepository;
    private final PositionRepository positionRepository;
    private final UserRepository userRepository;

    public UserPositionService(UserPositionRepository userPositionRepository, PositionRepository positionRepository, UserRepository userRepository) {
        this.userPositionRepository = userPositionRepository;
        this.positionRepository = positionRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<UserPositionResponse> getUserPositions(UUID userId) {
        return userPositionRepository.findByUserIdOrderByPriority(userId).stream()
                .map(up -> new UserPositionResponse(up.getId(), up.getPositionCode(), up.getPriority()))
                .toList();
    }

    @Transactional
    public List<UserPositionResponse> setUserPositions(UUID userId, List<PositionAssignment> assignments) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new DomainException("Usuario no encontrado"));
        userPositionRepository.deleteByUserId(userId);
        userPositionRepository.flush();

        for (PositionAssignment assignment : assignments) {
            if (!positionRepository.existsById(assignment.positionCode())) {
                throw new DomainException("Posicion no valida: " + assignment.positionCode());
            }
            UserPosition up = new UserPosition(user, assignment.positionCode(), assignment.priority());
            userPositionRepository.save(up);
        }
        return getUserPositions(userId);
    }

    @Transactional
    public UserPositionResponse addPosition(UUID userId, String positionCode, short priority) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new DomainException("Usuario no encontrado"));
        if (!positionRepository.existsById(positionCode)) {
            throw new DomainException("Posicion no valida: " + positionCode);
        }
        if (userPositionRepository.existsByUserIdAndPositionCode(userId, positionCode)) {
            throw new DomainException("El usuario ya tiene esta posicion");
        }
        UserPosition up = new UserPosition(user, positionCode, priority);
        userPositionRepository.save(up);
        return new UserPositionResponse(up.getId(), up.getPositionCode(), up.getPriority());
    }

    @Transactional
    public void removePosition(UUID userId, String positionCode) {
        List<UserPosition> positions = userPositionRepository.findByUserIdOrderByPriority(userId);
        UserPosition toRemove = positions.stream()
                .filter(up -> up.getPositionCode().equals(positionCode))
                .findFirst()
                .orElseThrow(() -> new DomainException("Posicion no encontrada para este usuario"));
        userPositionRepository.delete(toRemove);
    }

    public record UserPositionResponse(UUID id, String positionCode, short priority) {
    }

    public record PositionAssignment(String positionCode, short priority) {
    }
}