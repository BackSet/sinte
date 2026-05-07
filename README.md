# SINTE - Sistema de Gestión Deportiva

Sistema de gestión de convocatorias, asistencia y formación de equipos para deportes.

## Arquitectura

- **Backend**: Spring Boot 4 + Java 25 + PostgreSQL + Flyway
- **Frontend**: React 19 + TypeScript + Vite + TanStack Query + Zustand + Tailwind CSS 4
- **Autenticación**: JWT (access token + refresh token) con roles (ADMIN, DT, PLAYER)

## Requisitos

- Java 25+
- Node.js 20+
- PostgreSQL 16+
- Maven

## Configuración

### Backend

Crear la base de datos:

```sql
CREATE DATABASE sinte;
```

Configurar en `backend/src/main/resources/application.properties` o mediante variables de entorno:

| Variable | Default | Descripción |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/sinte` | URL de conexión |
| `SPRING_DATASOURCE_USERNAME` | `postgres` | Usuario BD |
| `SPRING_DATASOURCE_PASSWORD` | `nSpass_01M` | Contraseña BD |
| `APP_JWT_SECRET` | `change-this-secret-...` | Secreto JWT |

### Frontend

Crear `frontend/.env`:

```
VITE_API_URL=http://localhost:8080
```

## Ejecución

```bash
# Backend
cd backend
./mvnw spring-boot:run

# Frontend
cd frontend
npm install
npm run dev
```

El frontend se sirve en `http://localhost:5173` y el backend en `http://localhost:8080`.

## Migraciones

Las migraciones de Flyway se ejecutan automáticamente al iniciar. Los archivos están en `backend/src/main/resources/db/migration/`.

Las migraciones clave son:

| Migración | Descripción |
|---|---|
| V13 | `ends_at` opcional en matches |
| V14 | Integridad en generación de series |
| V15 | Limpieza de duplicados en series |
| V16 | `location` obligatorio en matches |
| V17 | Eliminación de columnas no usadas |
| V18 | Mueve `location`/`target_players` a series rules (segura) |
| V19 | Crea `match_configs`, agrega `config_id`, elimina `attendance_open`, hace `title` nullable |
| V20 | Modelo completo: `positions`, `user_positions`, `guest_players`, `guest_player_positions`, `source_type`, status `CANCELLED`, `guest_player_id` en `match_team_players`, elimina `primary_position`/`secondary_position` de users |

## Roles y Permisos

| Rol | Permisos |
|---|---|
| **ADMIN** | Todo: gestionar usuarios, roles, partidos, series, configs, grupos, invitados |
| **DT** | Crear/editar partidos y series, gestionar grupos, agregar invitados, formar equipos |
| **PLAYER** | Ver partidos, responder asistencia, ver equipos formados |

## Modelo de Datos

### Configs (`match_configs`)

Entidad centralizada que almacena configuración reutilizable para partidos y series:

- `location` — Ubicación (cancha, dirección)
- `target_players` — Plantilla objetivo (ej: 14 jugadores)
- `duration_minutes` — Duración en minutos
- `timezone` — Zona horaria
- `description` — Notas adicionales

Tanto partidos como series referencian un `config_id`. Los partidos mantienen un snapshot de `location` y `target_players` para inmutabilidad histórica.

### Partidos (`matches`)

- Creados manualmente o generados por una serie
- `source_type`: `MANUAL` o `SERIES`
- `attendance_open` se deriva dinámicamente: `status == SCHEDULED && startsAt > now()`
- `config_id` nullable (partidos manuales pueden no tener config)

### Asistencia

Los estados de asistencia son: `PENDING`, `YES`, `NO`, `CANCELLED`.

- `CANCELLED` permite implementar lista de espera: cuando un jugador canceló su confirmación, su cupo se libera
- El endpoint `/matches/{id}/roster` devuelve tres listas: **titular** (primeros N confirmados hasta `target_players`), **lista de espera** (los que sobran), y **cancelados**

### Posiciones (`positions`)

Catálogo de 10 posiciones predefinidas:

| Código | Nombre |
|---|---|
| `GOALKEEPER` | Portero |
| `CENTER_BACK` | Defensa central |
| `LEFT_BACK` | Lateral izquierdo |
| `RIGHT_BACK` | Lateral derecho |
| `DEFENSIVE_MIDFIELDER` | Mediocentro defensivo |
| `CENTRAL_MIDFIELDER` | Mediocentro |
| `ATTACKING_MIDFIELDER` | Mediapunta |
| `LEFT_WINGER` | Extremo izquierdo |
| `RIGHT_WINGER` | Extremo derecho |
| `STRIKER` | Delantero |

Los usuarios pueden tener múltiples posiciones con prioridad (`user_positions`). Los invitados también tienen posiciones (`guest_player_positions`).

### Invitados (`guest_players`)

Jugadores no registrados que un DT/ADMIN agrega a un partido:

- Tienen nombre, estado (`PENDING`/`YES`/`NO`/`CANCELLED`) y posiciones
- Se incluyen en la formación de equipos
- Solo DT/ADMIN pueden gestionar invitados

### Formación de Equipos

El endpoint `POST /matches/{id}/teams/suggest?teamSize=` sugiere equipos basándose en posiciones:

1. Obtiene todos los confirmados (usuarios + invitados con estado `YES`)
2. Agrupa por posición principal
3. Distribuye cada grupo de posición equitativamente entre los equipos (round-robin)
4.Los sin posición se asignan `"SIN_POSICION"` y se agrupan al final

El DT luego puede editar los equipos manualmente y guardar con `PUT /matches/{id}/teams`.

## API Endpoints

### Autenticación

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Público | Login |
| POST | `/api/v1/auth/register` | Público | Registro |
| GET | `/api/v1/auth/me` | Autenticado | Info del usuario |
| POST | `/api/v1/auth/logout` | Autenticado | Logout |

### Configs

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| GET | `/api/v1/configs` | DT, ADMIN | Listar configs |
| GET | `/api/v1/configs/{id}` | DT, ADMIN, PLAYER | Ver config |
| POST | `/api/v1/configs` | DT, ADMIN | Crear config |
| PUT | `/api/v1/configs/{id}` | DT, ADMIN | Actualizar config |
| DELETE | `/api/v1/configs/{id}` | DT, ADMIN | Eliminar config |

### Partidos

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| GET | `/api/v1/matches` | Autenticado | Listar partidos |
| POST | `/api/v1/matches` | DT, ADMIN | Crear partido manual |
| PUT | `/api/v1/matches/{id}` | DT, ADMIN | Editar partido |
| DELETE | `/api/v1/matches/{id}` | DT, ADMIN | Cancelar partido |
| GET | `/api/v1/matches/{id}/confirmed` | Autenticado | Lista de confirmados (usuarios + invitados) |
| GET | `/api/v1/matches/{id}/roster` | Autenticado | Titular + lista de espera + cancelados |
| GET | `/api/v1/matches/{id}/teams` | Autenticado | Ver equipos formados |
| POST | `/api/v1/matches/{id}/teams/suggest` | DT, ADMIN | Sugerir equipos |
| PUT | `/api/v1/matches/{id}/teams` | DT, ADMIN | Guardar equipos |
| GET | `/api/v1/matches/{id}/confirmed/export` | Autenticado | Exportar confirmados a XLSX |

### Invitados

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| GET | `/api/v1/matches/{id}/guest-players` | Autenticado | Listar invitados |
| POST | `/api/v1/matches/{id}/guest-players` | DT, ADMIN | Agregar invitado |
| PUT | `/api/v1/matches/{id}/guest-players/{gid}/attendance` | DT, ADMIN | Cambiar estado |
| DELETE | `/api/v1/matches/{id}/guest-players/{gid}` | DT, ADMIN | Eliminar invitado |

### Series

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| GET | `/api/v1/series` | Autenticado | Listar series |
| POST | `/api/v1/series` | DT, ADMIN | Crear serie |
| PUT | `/api/v1/series/{id}` | DT, ADMIN | Actualizar serie |
| DELETE | `/api/v1/series/{id}` | DT, ADMIN | Desactivar serie |

### Asistencia

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| GET | `/api/v1/attendance/match/{id}` | Autenticado | Ver asistencia de un partido |
| GET | `/api/v1/attendance/me` | Autenticado | Mi asistencia |
| POST | `/api/v1/attendance/respond` | Autenticado | Responder (YES/NO/CANCELLED) |
| POST | `/api/v1/attendance/unconfirm` | Autenticado | Volver a PENDING |

### Posiciones

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| GET | `/api/v1/positions` | Público | Catálogo de posiciones |
| GET | `/api/v1/users/{userId}/positions` | Autenticado | Ver posiciones de un usuario |
| PUT | `/api/v1/users/{userId}/positions` | DT, ADMIN | Reemplazar posiciones |
| POST | `/api/v1/users/{userId}/positions` | DT, ADMIN | Agregar posición |
| DELETE | `/api/v1/users/{userId}/positions/{code}` | DT, ADMIN | Eliminar posición |

### Grupos

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| GET | `/api/v1/groups` | Autenticado | Listar grupos |
| POST | `/api/v1/groups` | DT, ADMIN | Crear grupo |
| PATCH | `/api/v1/groups/{id}/active` | DT, ADMIN | Activar/desactivar |
| GET | `/api/v1/groups/{id}/members` | Autenticado | Miembros |
| POST | `/api/v1/groups/{id}/members` | DT, ADMIN | Agregar miembro |
| DELETE | `/api/v1/groups/{id}/members/{uid}` | DT, ADMIN | Quitar miembro |
| GET | `/api/v1/groups/me` | Autenticado | Mis grupos |

### Usuarios

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| GET | `/api/v1/users` | ADMIN | Listar usuarios |
| POST | `/api/v1/users` | ADMIN | Crear usuario |
| PATCH | `/api/v1/users/{id}/active` | ADMIN | Activar/desactivar |

### Notificaciones

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| GET | `/api/v1/notifications` | Autenticado | Listar notificaciones |
| POST | `/api/v1/notifications/{id}/read` | Autenticado | Marcar como leída |
| POST | `/api/v1/notifications/read-all` | Autenticado | Marcar todas como leídas |

## Frontend - Rutas

| Ruta | Componente | Roles |
|---|---|---|
| `/dashboard` | DashboardPage | Autenticado |
| `/matches` | MatchesPage | Autenticado |
| `/attendance` | AttendancePage | Autenticado |
| `/my-groups` | MyGroupsPage | Autenticado |
| `/notifications` | NotificationsPage | Autenticado |
| `/series` | SeriesPage | DT, ADMIN |
| `/groups` | GroupsPage | DT, ADMIN |
| `/configs` | ConfigsPage | DT, ADMIN |
| `/users` | UsersPage | ADMIN |
| `/roles` | RolesPage | ADMIN |

## Flujo Principal

1. Un **DT/ADMIN** crea un **MatchConfig** (ubicación, plantilla, duración, zona horaria)
2. Crea un **partido manual** o una **serie recurrente** referenciando ese config
3. Se envían notificaciones a los jugadores de los grupos objetivo
4. Los **jugadores** confirman o decline su asistencia
5. El DT puede agregar **invitados** al partido con sus posiciones
6. El DT puede ver el **roster** con titular, lista de espera y cancelados
7. El DT puede **sugerir equipos** basándose en posiciones o formarlos manualmente
8. Los **ADMIN** pueden gestionar usuarios, roles y posiciones desde la página de Usuarios

## Generación Automática de Series

Las series generan partidos automáticamente mediante un `@Scheduled` que corre diariamente a las 3am (configurable). Soporta tres tipos de recurrencia:

- **WEEKLY**: Día de semana + hora de inicio
- **EVERY_N_DAYS**: Intervalo en días + hora de inicio
- **MONTHLY_DAY_OF_MONTH**: Día del mes + hora de inicio