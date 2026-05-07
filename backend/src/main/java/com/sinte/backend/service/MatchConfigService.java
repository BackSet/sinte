package com.sinte.backend.service;

import com.sinte.backend.domain.MatchConfig;
import com.sinte.backend.repository.MatchConfigRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchConfigService {

    private final MatchConfigRepository matchConfigRepository;

    public MatchConfigService(MatchConfigRepository matchConfigRepository) {
        this.matchConfigRepository = matchConfigRepository;
    }

    @Transactional
    public MatchConfig createConfig(String location, Integer targetPlayers, Integer durationMinutes, String timezone, String description) {
        if (location == null || location.isBlank()) {
            throw new DomainException("La ubicacion es obligatoria");
        }
        if (targetPlayers == null || targetPlayers <= 0) {
            throw new DomainException("La plantilla objetivo debe ser mayor a 0");
        }
        if (durationMinutes == null || durationMinutes <= 0) {
            throw new DomainException("La duracion debe ser mayor a 0 minutos");
        }
        if (timezone == null || timezone.isBlank()) {
            throw new DomainException("La zona horaria es obligatoria");
        }
        MatchConfig config = new MatchConfig(location, targetPlayers, durationMinutes, timezone, description);
        return matchConfigRepository.save(config);
    }

    @Transactional(readOnly = true)
    public MatchConfig getConfig(UUID id) {
        return matchConfigRepository.findById(id)
                .orElseThrow(() -> new DomainException("Configuracion no encontrada"));
    }

    @Transactional(readOnly = true)
    public List<MatchConfig> listConfigs() {
        return matchConfigRepository.findAll();
    }

    @Transactional
    public MatchConfig updateConfig(UUID id, String location, Integer targetPlayers, Integer durationMinutes, String timezone, String description) {
        MatchConfig config = getConfig(id);
        config.update(location, targetPlayers, durationMinutes, timezone, description);
        return matchConfigRepository.save(config);
    }

    @Transactional
    public void deleteConfig(UUID id) {
        if (!matchConfigRepository.existsById(id)) {
            throw new DomainException("Configuracion no encontrada");
        }
        matchConfigRepository.deleteById(id);
    }
}