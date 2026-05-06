---
schemaVersion: 1
scope: workspace
updatedAt: "2026-05-06T20:42:00.769Z"
workspaceName: "frontend"
---

# Project Memory

## Project Overview
- Rediseño de app web a sistema moderno de reservas de canchas de fútbol sintético.
- Mantener funcionalidades existentes: usuarios, roles, partidos, grupos, asistencia, notificaciones, exportación Excel y sugerencia de equipos.
- Objetivo UI: SaaS moderno (Linear/Notion/Stripe) con React + TypeScript + Tailwind CSS 4.

## Current State
- Arquitectura base confirmada: `src/App.tsx` monta `AppProviders` + `AppRouter`.
- `App.jsx` no existe; fuente activa real: `src/App.tsx`.
- Se volvió a inspeccionar workspace (46 archivos) y se revisaron `AppRouter` y `MobileTabBar`.
- No hay confirmación de cambios persistidos de etapa 1 ni validación de compilación completada.
- `DESIGN.md` sigue ausente.

## Artifacts
- `src/App.tsx`: entrypoint estable, no reconstruir.
- `src/app/AppProviders.tsx`: providers globales (auth/query/theme), no tocar lógica sensible.
- `src/app/AppRouter.tsx`: rutas actuales; punto principal para extender con nuevas vistas y redirects.
- `src/components/navigation/MobileTabBar.tsx`: navegación móvil a modernizar.
- Relevantes: `RequireAuth`, `RequireRole`, `DateTimeField`, `index.html`.

## Design Direction
- Implementación por capas visuales, sin alterar negocio/auth/API/stores.
- App shell SaaS reusable: sidebar + topbar + content, responsive, dark/light.
- Etapa 1 enfocada en vistas iniciales con datos mock/adapters visuales.
- Microcopy y etiquetas en español de Ecuador.

## User Feedback
- Restricciones reiteradas:
  - No eliminar archivos existentes; extender/reemplazar solo vistas visuales.
  - Mantener rutas actuales funcionando; añadir compatibilidad/redirects.
  - No modificar lógica de negocio, hooks, stores ni servicios API.
  - Estructura clara por features: dashboard, calendar, courts, reservations, matches, admin.
  - Validar compilación al final.
  - Entregar lista clara de archivos modificados y documentar en `DESIGN.md`.

## Decisions
- Mantener intacto `AppProviders + AppRouter` como arquitectura base.
- No tocar lógica sensible (auth/API/Zustand/TanStack Query).
- Usar wrappers y datos mock antes de integración real.
- Ejecutar por etapas con verificación de build.

## Open Questions
- Mapeo exacto de rutas actuales a nuevas rutas canónicas y redirects requeridos.
- Qué layout existente reutilizar (`DashboardLayout`) vs nuevo shell visual.
- Alcance exacto de mocks en calendario/reservas durante etapa 1.

## Next Steps
- Implementar etapa 1 completa:
  - Shell SaaS base responsive (sidebar/topbar/theme).
  - Nuevas rutas `dashboard/calendar/courts/reservations/matches/admin` + redirects de compatibilidad.
  - Vistas iniciales con mocks (cards KPI, badges, vacíos, loaders).
  - Modernizar `MobileTabBar`.
- Crear `DESIGN.md` mínimo con decisiones visuales estables.
- Correr validación de compilación y reportar archivos modificados exactos.

## Promotion Candidates For DESIGN.md
- Patrón de app shell y comportamiento responsive.
- Sistema semántico de badges de estado (disponible/ocupada/mantenimiento/asistencia).
- Patrones de cards KPI, empty states y loaders.
- Convenciones dark/light para superficies y jerarquía.
- Reglas de navegación móvil (tabs principales + menú “más”).

## Recent History
- 2026-05-06: Usuario solicita ejecutar etapa 1 completa con restricciones estrictas y estructura por features.
- 2026-05-06: Se crean todos de trabajo (inspección, implementación, mobile tab, DESIGN.md, validación).
- 2026-05-06: Se inspecciona workspace nuevamente y se visualizan `AppRouter` y `MobileTabBar`.
- 2026-05-06: Implementación aún no confirmada como aplicada ni compilada en esta sesión.