# Integración QuickBooks Online — Costos y Alcances

**Documento informativo para cliente**
**Fecha:** 28 de abril de 2026
**Proyecto:** Starcorp
**Programa vigente:** Intuit App Partner Program (activo desde el 28 de julio de 2025)

---

## 1. Cuenta de Developer

- El registro en **developer.intuit.com** es **gratuito**.
- La dirección física que solicita Intuit al registrarse es únicamente requisito administrativo para emitir las credenciales OAuth (`client_id` / `client_secret`) y habilitar el entorno de Sandbox.
- No implica ningún cargo ni compromiso de pago.

---

## 2. Modelo de Cobro

Intuit clasifica las llamadas a la API en dos categorías. **Solo las lecturas se cobran.**

| Tipo de operación | Qué incluye | Costo |
|---|---|---|
| **Core API** (escritura) | Crear o actualizar facturas, bills, clientes, proveedores, ítems, etc. | **Gratis e ilimitado** |
| **CorePlus API** (lectura) | Leer cuentas contables, consultar información de la empresa, generar reportes | **Metrado (con cuota mensual)** |
| **Sandbox** | Llamadas hechas en el entorno de pruebas | **Gratis — no cuentan en la cuota** |
| **Webhooks** | Notificaciones de cambio (sin contenido) | Gratis, pero requieren una lectura metrada para traer el dato |

---

## 3. Planes Disponibles (Tiers)

| Tier | Costo mensual | Lecturas incluidas | Costo por excedente |
|---|---|---|---|
| **Builder** (por defecto) | **$0 USD** | 500,000 / mes | Se **bloquea** al llegar al tope |
| **Silver** | $300 USD | 1,000,000 / mes | $3.50 por cada 1,000 llamadas |
| **Gold** | $1,700 USD | 10,000,000 / mes | Menor que Silver |
| **Platinum** | $4,500 USD | 75,000,000 / mes | $0.25 por cada 1,000 llamadas |

> **Importante:** El tier Builder no permite excedente. Si se agotan las 500,000 lecturas del mes, las solicitudes se bloquean hasta el siguiente ciclo de facturación.

---

## 4. Límites Técnicos (aplican en todos los tiers)

Estos límites son **por empresa conectada** (Realm ID), no por aplicación:

- **500 requests por minuto** (estándar)
- **10 solicitudes concurrentes** máximo
- **40 requests por minuto** para operaciones batch
- **200 requests por minuto** para endpoints pesados (reportes, etc.)
- **Tokens de acceso:** expiran en 1 hora
- **Refresh tokens:** expiran en 101 días

---

## 5. Alcance para el Proyecto Starcorp

### 5.1 Tier inicial recomendado: **Builder ($0)**

Con 500,000 lecturas mensuales y considerando que **cada cliente conecta su propia empresa de QuickBooks**, cada empresa cuenta con su propia cuota independiente de 500,000 lecturas/mes. Esto es suficiente para el MVP y operación inicial.

### 5.2 Estrategias de optimización del consumo

Para mantenernos dentro del tier gratuito el mayor tiempo posible, la arquitectura ya contempla:

1. **Proxy a través de Supabase Edge Functions** — las llamadas no se hacen desde la app del usuario directamente, lo cual permite cachear datos del lado del servidor.
2. **Caché de lecturas en Supabase** — los datos consultados se almacenan temporalmente para que múltiples usuarios viendo el mismo dashboard no generen múltiples llamadas a QuickBooks.
3. **Uso de Webhooks** — en vez de consultar QuickBooks periódicamente para detectar cambios, QuickBooks notifica cuando algo cambia y solo entonces refrescamos el caché.
4. **Desarrollo y QA en Sandbox** — todo el trabajo de desarrollo no consume cuota de producción.

### 5.3 Cuándo evaluar subir a un tier de pago

Se recomienda subir a Silver ($300/mes) o superior cuando:

- El número de empresas conectadas crezca significativamente y la suma de consumos individuales se acerque al tope.
- Se agreguen funcionalidades de reportes en tiempo real con alta frecuencia de consulta.
- Se observen bloqueos por excedente de cuota en el panel de Intuit.

---

## 6. Resumen Ejecutivo

| Aspecto | Estado |
|---|---|
| Costo de cuenta de developer | **Gratis** |
| Costo de escribir datos en QuickBooks | **Gratis e ilimitado** |
| Costo de leer datos de QuickBooks | Gratis hasta 500,000 lecturas/mes por empresa |
| Costo de Sandbox (desarrollo) | **Gratis** |
| Costo estimado en fase MVP | **$0 USD/mes** |
| Costo proyectado a escala | $300 – $4,500 USD/mes según volumen |

---

## 7. Fuentes

- Portal oficial Intuit Developer: https://developer.intuit.com
- Documentación oficial de tarifas: https://help.developer.intuit.com/s/article/platform-service-fees
- Análisis de pricing 2026 (Truto): https://truto.one/blog/how-much-does-the-quickbooks-api-cost-2026-pricing-rate-limits
- App Partner Program (Apideck): https://www.apideck.com/blog/quickbooks-api-pricing-and-the-intuit-app-partner-program
- Guía de rate limits (Satva Solutions): https://satvasolutions.com/blog/saas-leaders-guide-api-rate-limits-in-accounting-platforms
