# Idea Principal - MVP Reservas Condominio

## Problema

Los condominios gestionan reservas de áreas comunes (salón de eventos, piscina, cancha, quincho) con:
- Hojas de papel / Excel → errores, solapamientos, sin historial
- WhatsApp admin → ruido, no escalable, sin trazabilidad
- Residentes no saben disponibilidad real → frustración

## Solución MVP

**App web mobile-first** donde:
1. **Residente** ve disponibilidad real → reserva en 3 clicks → recibe confirmación
2. **Admin** ve todas las solicitudes → aprueba/rechaza con un click → notifica automático
3. **Seguridad** (opcional) valida check-in/out en puerta

## Usuarios y Flujos

### Residente (80% usuarios)
```
Login → Dashboard (áreas + mis reservas) → Seleccionar área → 
Calendario disponibilidad → Pick fecha/hora → Confirmar → 
Recibir email/WhatsApp → Ver estado (pendiente/aprobada/rechazada)
```

### Admin (15% usuarios)
```
Login → Panel admin → Lista reservas (filtros: pendientes, hoy, semana) → 
Ver detalle → Aprobar/Rechazar (nota opcional) → Notificación auto
```

### Seguridad (5% usuarios - fase 2)
```
Login → Lista reservas hoy → Check-in (QR/código) → Check-out → 
Marcar no-show / incidencias
```

## Reglas de Negocio Core

| Regla | Valor MVP | Configurable |
|-------|-----------|--------------|
| Anticipación mínima | 2 horas | Sí (por área) |
| Anticipación máxima | 30 días | Sí |
| Duración máxima | 4 horas | Sí (por área) |
| Reservas/semana por usuario | 2 | Sí |
| Ventana cancelación | 4 horas antes | Sí |
| Aprobación automática | No (siempre admin) | Fase 2 |

## Diferenciadores vs Competencia

1. **Constraint BD real**: PostgreSQL `EXCLUDE` constraint evita solapamientos a nivel BD (no solo app)
2. **Supabase Auth nativo**: Magic link sin password, row-level security
3. **Real-time**: Cambios de estado instantáneos sin polling
4. **Costo $0**: Supabase free tier + Vercel free tier
5. **Mobile-first**: PWA-ready, funciona en celular sin app store

## Métricas de Éxito MVP

- [ ] 10+ residentes registrados semana 1
- [ ] 20+ reservas creadas semana 1
- [ ] < 5% reservas con solapamiento (debe ser 0% por constraint)
- [ ] < 2 min tiempo reserva completa
- [ ] 0 bugs críticos en producción

## Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Supabase free tier limits | Media | Alto | Monitorear uso, plan B: Railway/Neon |
| Auth magic link spam | Baja | Medio | Rate limit + honeypot |
| Adopción residentes baja | Alta | Alto | Onboarding guiado, QR en áreas comunes |
| Disponibilidad horaria compleja | Media | Medio | Empezar simple: franjas fijas, después flexibles |

## Stack Justificación

| Herramienta | Por qué |
|-------------|---------|
| Next.js 14 App Router | Server Components = menos JS cliente, SEO, performance |
| TypeScript strict | Cero runtime errors en tipos, refactor seguro |
| Tailwind + shadcn/ui | UI consistente rápido, zero custom CSS, accesible |
| Supabase | Postgres real + Auth + Realtime + Edge functions gratis |
| pnpm | Fast, disk-efficient, monorepo-ready |
| Vercel | Deploy git-push, preview deployments, edge network |

## Fuera de Alcance (No MVP)

- ❌ Pagos / facturación
- ❌ Múltiples condominios (multi-tenant)
- ❌ App nativa iOS/Android
- ❌ Integración porteros físicos / IoT
- ❌ Reportes avanzados / BI
- ❌ Chat interno
- ❌ Marketplace proveedores