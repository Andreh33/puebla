# CRM de leads y privacidad · Zona Sport

Este documento describe cómo se gestionan los leads que llegan desde la web y
qué procedimientos se aplican para cumplir el RGPD.

---

## Flujo end-to-end de un lead

```
[ Usuario en /contacto ]
        │
        │  POST /api/leads  (LeadSchema + honeypot + rate-limit 5/h por IP)
        ▼
[ DB.Lead row created ]
        │
        ├──► Email a ADMIN_NOTIFICATION_EMAIL  (lead-received-admin.tsx)
        └──► Email a usuario                   (lead-confirmation-user.tsx)
        │
        ▼
[ Admin abre /admin/leads ]
   - Filtros: q (texto), estado, rango de fechas
   - Acciones: cambiar estado, notas internas, marcar spam,
               responder por WhatsApp, exportar CSV, anonimizar (RGPD)
```

### Endpoint público `POST /api/leads`

- Validación con `LeadSchema` (Zod).
- **Honeypot**: si el campo `website` viene relleno, respondemos `{ ok: true }`
  sin guardar nada (bots silenciados).
- **Rate limit**: 5 envíos por IP cada hora. Devuelve 429 si se excede.
- Persiste `Lead` con `ipAddress` y `userAgent` para forensic.
- Envía 2 emails vía Resend (admin + usuario). Si Resend no está configurado
  o falla, **el lead ya está guardado**; el fallo solo se logea.

### Página `/admin/leads`

- Tabla con `@tanstack/react-table`.
- Columnas: estado · nombre · email · teléfono · mensaje (truncado) · fecha · acciones.
- Estados como `Badge` (Nuevo · Contactado · Cerrado · Spam).
- Filtros server-side (no client-side): los parámetros se serializan en la URL,
  así son compartibles y bookmark-ables.
- Paginación de 25 filas por página.

### Detalle `/admin/leads/[id]`

- Vista lateral con:
  - Mensaje completo y datos del contacto.
  - Selector de estado (mutación inmediata).
  - Notas internas (textarea con guardar manual).
  - Botón **Responder por WhatsApp** (usa `whatsappUrl()` con mensaje
    pre-relleno; si el lead tiene `productId` asociado, usa
    `WhatsAppMessages.product()`).
  - Botón **Marcar como spam**.
  - Botón **Anonimizar (RGPD)** con confirmación.
  - Botón **Eliminar** (borrado físico, solo cuando anonimizar no basta).

### Exportar CSV

Server action `exportLeadsCsv()` aplica los filtros activos, escapa campos y
devuelve `{ filename, csv }` para que el cliente lo descargue como Blob.
Tope de 10 000 filas por export.

---

## Anonimización (RGPD)

La server action `anonymizeLead()` sustituye:

- `name` → `<anonimizado>`
- `email` → `anon-<id>@anonimizado.invalid` (mantiene el `@@unique` virtual sin colisionar)
- `phone` → `null`
- `ipAddress` → `null`
- `userAgent` → `null`
- `status` → `CLOSED`
- `notes` → `"Lead anonimizado bajo petición RGPD."`

No borra la fila para conservar contabilidad (timestamps, página origen,
producto referenciado, etc.).

### Borrado físico (`deleteLead`)

Solo se usa cuando el dueño del dato pide expresamente la **supresión total**.
La acción está protegida por `AlertDialog` y revalida `/admin/leads`.

---

## Peticiones de privacidad

El endpoint público `POST /api/privacy/request` recibe `{ email, type, notes }`
con `type` en `access | erasure | rectification | portability` y:

1. Rate-limit `privacy:{ip}` 3/hour.
2. Crea un `Lead` con `notes = "privacy-request:<type>"` y mensaje
   informativo.
3. Notifica al admin (si `ADMIN_NOTIFICATION_EMAIL` está configurado).

La gestión humana se hace desde `/admin/leads` filtrando por mensaje o notas.

---

## Política de retención

- Leads activos: indefinidos.
- Leads `CLOSED` con > 24 meses de antigüedad: candidatos a anonimización
  o borrado en un próximo cron (TODO: añadir `/api/cron/leads-retention`).
- Newsletter: opt-out actualiza `unsubscribedAt`; las filas no se borran para
  evitar re-suscripciones accidentales.

---

## Datos sensibles que NO se guardan

- Contraseñas o tokens del usuario.
- Datos de pago (la fase 2 con Stripe usa Stripe Customers).
- Geolocalización fina (solo guardamos `ipAddress`).
