====================================================
  NEXIATASK — API DE INTEGRACIÓN
  Para uso exclusivo del área de Sistemas
====================================================

BASE URL:  https://nexiatask-api.onrender.com/api
API KEY:   nexia_2025_k9mX4pQr7vBjL2wN8sT

Incluir en cada llamado:
  Header:  X-API-Key: nexia_2025_k9mX4pQr7vBjL2wN8sT

====================================================
  ENDPOINTS DISPONIBLES
====================================================

1. AVANCE SEMANAL  (reemplaza al antiguo /integration/seguimiento, ya no existe)
      GET /integration/avance

   Parámetros opcionales:
   - week_start=YYYY-MM-DD   (semana específica, por defecto: semana actual)
   - include_completed=true  (incluye tareas Aprobada/Cerrada y No realizada)

   Ejemplo:
   GET https://nexiatask-api.onrender.com/api/integration/avance
   GET https://nexiatask-api.onrender.com/api/integration/avance?week_start=2025-05-10
   GET https://nexiatask-api.onrender.com/api/integration/avance?include_completed=true

   Campos que devuelve por tarea:
   - departamento
   - responsable
   - tarea_id
   - tarea
   - responsabilidad     (iniciativa padre, NUEVO)
   - objetivo
   - meta
   - estado
   - prioridad
   - es_recurrente       (true/false, NUEVO)
   - fecha_limite
   - completada_en
   - razon_no_realizada
   - semana
   - actualizado  (true/false)
   - seguimiento
   - resultado           (mismo valor que seguimiento, por compat)
   - cumplimiento_pct    (0-100; nunca null - 0 si no se midio)
   - bloqueo
   - apoyo_requerido

   La respuesta es un objeto: { semana, week_start, total_tareas,
   actualizadas, sin_actualizar, tareas[] }.

   Estados válidos: Pendiente, En progreso, Recurrente, Bloqueada,
   En espera de cliente, En espera de usuario/Presidencia,
   Lista para revisión, Devuelta / Requiere ajustes,
   Aprobada / Cerrada, No realizada.

2. LISTA DE TAREAS
      GET /integration/tareas

   Parámetros opcionales:
   - status=En progreso
   - responsible_user_id=uuid
   - department_id=uuid

   Ejemplo:
   GET https://nexiatask-api.onrender.com/api/integration/tareas

3. KPIs GLOBALES
      GET /integration/kpis

   Ejemplo:
   GET https://nexiatask-api.onrender.com/api/integration/kpis

4. HISTORIAL DE AVANCES POR TAREA  (NUEVO 2026-06)
      GET /integration/historial

   Devuelve cada tarea con un array vances (historial completo
   semana por semana, mas reciente primero).

   Parametros opcionales:
   - tarea_id=<id>   (devuelve solo el historial de esa tarea)

   Ejemplo:
   GET https://nexiatask-api.onrender.com/api/integration/historial
   GET https://nexiatask-api.onrender.com/api/integration/historial?tarea_id=<id>

   Respuesta:
   {
     "tareas": [
       {
         "tarea_id": "...",
         "tarea": "Visitas a cliente",
         "responsable": "Daniel Zapata",
         "total_avances": 18,
         "avances": [
           {
             "semana": "2026-06-07T00:00:00+00:00",
             "resultado": "Esta semana se realizaron...",
             "cumplimiento_pct": 80,
             "bloqueo": "",
             "apoyo_requerido": ""
           }
         ]
       }
     ]
   }

====================================================
  EJEMPLO EN PYTHON
====================================================

import requests

API  = "https://nexiatask-api.onrender.com/api/integration"
KEY  = "nexia_2025_k9mX4pQr7vBjL2wN8sT"
HEAD = {"X-API-Key": KEY}

# Seguimiento semana actual

seg = requests.get(f"{API}/avance", headers=HEAD).json()
for t in seg["tareas"]:
    print(t["departamento"], t["responsable"], t["tarea"], t["cumplimiento_pct"])

# Seguimiento semana específica

seg = requests.get(f"{API}/avance",
    params={"week_start": "2025-05-10", "include_completed": True},
    headers=HEAD).json()

# Todas las tareas

tareas = requests.get(f"{API}/tareas", headers=HEAD).json()

# KPIs

kpis = requests.get(f"{API}/kpis", headers=HEAD).json()

====================================================
  EJEMPLO EN JAVASCRIPT / NODE
====================================================

const API  = "https://nexiatask-api.onrender.com/api/integration";
const HEAD = { "X-API-Key": "nexia_2025_k9mX4pQr7vBjL2wN8sT" };

// Seguimiento
const res  = await fetch(`${API}/avance`, { headers: HEAD });
const data = await res.json();
console.log(data.tareas);

// KPIs
const kpis = await fetch(`${API}/kpis`, { headers: HEAD }).then(r => r.json());

====================================================
  NOTAS IMPORTANTES
====================================================

- No se requiere login ni tokens. Solo el header X-API-Key.
- La semana empieza el SÁBADO (formato YYYY-MM-DD).
- Todas las fechas están en UTC (ISO 8601).
- cumplimiento_pct va de 0 a 100.
- Si "actualizado" es false, los campos seguimiento/bloqueo/
    apoyo_requerido vienen vacíos para esa semana.
- Acceso de solo lectura. No modifica datos.

# Contacto técnico: blue.solutions2025@gmail.com
