## Descripción

Mejorar el sistema de reservas: calendar visual, CRUD áreas/horarios (admin), validaciones de negocio, notificaciones.

## Qué hay que hacer

### Residente

- [ ] Calendar visual interactivo (react-day-picker) en nueva reserva
- [ ] Ver disponibilidad en tiempo real al seleccionar fecha
- [ ] Validación: max 2 reservas/semana por usuario
- [ ] Validación: anticipación mínima 2h, máxima 30 días
- [ ] Validación: max 4 horas por reserva (configurable por área)

### Admin

- [ ] CRUD áreas comunes: crear, editar, desactivar
- [ ] CRUD horarios por área/día: definir open/close, max duración
- [ ] Vista calendario mensual con todas las reservas
- [ ] Filtros: por área, por estado, por fecha, por usuario

### Notificaciones (fase 2)

- [ ] Email confirmación reserva creada
- [ ] Email reserva aprobada/rechazada
- [ ] Recordatorio 24h antes

## Criterios de aceptación

- Calendar muestra días disponibles/no disponibles visualmente
- Admin puede gestionar áreas y horarios sin tocar SQL
- Validaciones de negocio se aplican en frontend + backend (Server Actions)
- Responsive mobile-first

## Referencias

- react-day-picker: https://react-day-picker.js.org
- Supabase Realtime para disponibilidad live (opcional)

## Responsable

@Trizzoth
