package com.sinte.backend.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class UserPositionSchemaRepair implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    public UserPositionSchemaRepair(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute("alter table if exists users add column if not exists primary_position varchar(40)");
        jdbcTemplate.execute("alter table if exists users add column if not exists secondary_position varchar(40)");
        jdbcTemplate.update(
                "update users set primary_position = 'CENTRAL_MIDFIELDER' where primary_position is null"
        );
        jdbcTemplate.execute("alter table if exists users alter column primary_position set not null");
    }
}
