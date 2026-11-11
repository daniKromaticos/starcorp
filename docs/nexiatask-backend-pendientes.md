# NexiaTask — Pendientes con equipo backend

Documento para alinear con el equipo de NexiaTask (contacto: blue.solutions2025@gmail.com)
sobre cambios necesarios en la API antes de pasar de mocks a integración real
en la app de Starcorp.

Estado actual (frontend):

- Pantallas `/(tabs)/reportes` y `/(tabs)/reportes/[taskId]` ya maquetadas
  usando datos mock con el **shape exacto** de la API documentada (`NexiataskTareaRaw`).
- Hooks (`useNexiataskResponsibilities`, `useNexiataskTarea`) listos —
  consumen `src/services/nexiatask.service.ts` que hoy retorna mocks
  vía `withMock`.
- Cuando los 4 puntos de abajo se resuelvan, solo hay que implementar
  la Edge Function y cambiar `EXPO_PUBLIC_USE_MOCKS=false`.

---

## 1. Concepto de "Proyecto / Iniciativa padre" — ✅ RESUELTO (2026-06)

> **Resuelto:** `GET /api/integration/avance` ahora incluye el campo
> `responsabilidad` por tarea (p. ej. "Desarrollo de cuentas PATRIOT"). El
> frontend agrupa departamento → `responsabilidad` → tareas en
> `groupTareasIntoResponsibilities`, reemplazando el heurístico de chunks de 4.
> Si más adelante hace falta un `proyecto_id` estable (para deep-links o
> reordenamiento), se solicitará por separado.

La UI agrupa tareas en proyectos numerados:

```
1. Desarrollo del área comercial — 4 tareas ▼
   ├─ Estrategia de referidos desde la operación
   ├─ Enviar reporte de presupuesto de pauta
   ├─ Evaluar viabilidad de seguir desarrollando K
   └─ Atacar a los OMNI
2. Desarrollo del área comercial — 4 Tareas ▼
3. …
```

La API previa (`GET /integration/tareas`, `GET /integration/seguimiento`)
solo exponía `departamento`, `tarea_id`, `tarea` — no había campo de proyecto/iniciativa
padre, así que el frontend agrupaba con un heurístico temporal (chunks de 4
tareas por departamento) que no reflejaba la realidad de negocio. Con `/avance`
y su campo `responsabilidad` esto quedó resuelto (ver nota arriba).

**Solicitud:** agregar a cada tarea los campos:

```jsonc
{
  "proyecto_id": "uuid",
  "proyecto_titulo": "Desarrollo del área comercial",
  "proyecto_numero": 1,
}
```

O bien exponer un endpoint nuevo `GET /integration/proyectos` que retorne la
jerarquía completa `proyecto → tareas[]`.

---

## 2. Histórico de avances por tarea — ✅ RESUELTO (2026-06)

> **Resuelto:** backend expuso `GET /api/integration/historial`, que
> devuelve cada tarea con un array `avances` (historial completo semana
> por semana, más reciente primero). Admite `?tarea_id=<id>` para una
> sola tarea. El frontend lo consume desde `fetchTareaDetalle` (en
> paralelo con `/avance`) y lo mapea con `mapHistorialAvances`
> (`src/services/mock/nexiatask.mock.ts`). Se agregó `historial` a la
> allowlist del proxy. Además: `/avance` reintrodujo `resultado` (mismo
> valor que `seguimiento`, por compat) y `cumplimiento_pct` ya nunca
> llega `null` (0 si no se midió esa semana).

La pantalla de detalle (`/reportes/[taskId]`) tiene una sección **"Avances"**
que muestra N semanas previas de la misma tarea:

```
FEB 02 — Semana Febrero 09-13 — "—"
FEB 02 — Semana Febrero 02-06 — "Se presentaron las primeras estadísticas…"
ENE 01 — Semana Enero 26 - 30 — "Se están realizando los primeros pilotos…"
```

Cada avance de `/historial` trae: `semana`, `resultado`, `cumplimiento_pct`,
`bloqueo`, `apoyo_requerido`. El frontend sintetiza el `id` UI como
`tarea_id__semana` (la API no devuelve id por avance) y muestra empty
state cuando `avances` viene vacío.

---

## 3. Enums de `estado` y `prioridad` — ✅ RESUELTO (2026-06)

> **Resuelto:** la doc de `/avance` ya lista los estados válidos:
>
> ```
> estado:    "Pendiente" | "En progreso" | "Recurrente" | "Bloqueada"
>          | "En espera de cliente" | "En espera de usuario/Presidencia"
>          | "Lista para revisión" | "Devuelta / Requiere ajustes"
>          | "Aprobada / Cerrada" | "No realizada"
> prioridad: "Alta" | "Media" | "Baja"
> ```
>
> El frontend detecta el estado terminal "exitoso" con `/aprobad|cerrad/i`
> (ver `isCompletedState` en `ml-task-row` y `or-task-detail-card`).

---

## 4. Seguridad: API key no debe ir al cliente — **importante**

La API hoy se autentica con un header estático:

```
X-API-Key: nexia_2025_k9mX4pQr7vBjL2wN8sT
```

Esta key **no puede vivir en el bundle de la app móvil** (cualquiera con el APK
podría extraerla y consumir la API ilimitadamente). Por convención de este
proyecto, las APIs externas se proxean a través de Edge Functions de Supabase
que verifican el JWT del usuario.

**Plan de implementación (lado Starcorp):**

```
app/(tabs)/reportes/*  ──► useNexiataskResponsibilities ──►
   nexiatask.service.ts ──► supabase.functions.invoke('nexiatask-proxy')
                                       │
                                       ▼
                            supabase/functions/nexiatask-proxy/
                            - valida JWT del usuario
                            - inyecta X-API-Key desde Deno.env (secret)
                            - allowlist: ['avance', 'tareas', 'kpis',
                                          'historial']
                            - fetch a nexiatask-api.onrender.com
                            - retorna response al cliente
```

**Solicitud al equipo de NexiaTask (opcional pero recomendado):** considerar
rotar la API key periódicamente o moverse a autenticación con tokens de
servicio scoped (un token por tenant/cliente integrador), de manera que si
una key se compromete no se ven afectados todos los consumidores.

---

## 5. Detalles menores

- **Formato de `semana`:** confirmar que es siempre el sábado en formato `YYYY-MM-DD`
  en UTC. Frontend hace `new Date(semana + 'T00:00:00Z')`; si llega con timezone
  diferente cambian los días mostrados.
- **`actualizado: false`:** el doc dice que cuando es false, los campos
  `resultado`/`bloqueo`/`apoyo_requerido` vienen vacíos. Confirmar si llegan como
  `""` o `null` para ajustar el render del empty state ("—").
- **Paginación:** `GET /integration/tareas` retorna todas las tareas. ¿Hay límite?
  ¿Filtros server-side por fecha? Si crecen mucho, conviene cursor pagination.

---

## Checklist para destrabar la integración real

- [x] Backend expone `responsabilidad` (iniciativa padre) en `/avance` — resuelve el agrupamiento (2026-06)
- [x] Backend expone `GET /integration/historial` (histórico de avances por tarea, opt. `?tarea_id=`) (2026-06)
- [x] Backend documenta enums de `estado` y `prioridad` (2026-06)
- [x] Starcorp migra la conexión de `/seguimiento` → `/avance` (proxy + tipos + service + mock, 2026-06)
- [x] Starcorp conecta `/historial` (proxy allowlist + tipos + `mapHistorialAvances` + `fetchTareaDetalle`, 2026-06)
- [x] Starcorp implementa `supabase/functions/nexiatask-proxy/index.ts` (deployada 2026-05-18, version 1, ACTIVE)
- [ ] Starcorp setea el secret: `supabase secrets set NEXIATASK_API_KEY=nexia_2025_k9mX4pQr7vBjL2wN8sT`
- [ ] Starcorp setea `EXPO_PUBLIC_USE_MOCKS=false` en `.env` y prueba en staging

---

**Última actualización:** 2026-06-10
**Owner frontend:** Daniel Cordero / Kromaticos
**Owner backend:** blue.solutions2025@gmail.com
