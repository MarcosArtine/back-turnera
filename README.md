# PFO1 - TurnoFlex — Gestión de Turnos
**Desarrollo de Sistemas Web Front End • TSDS • IFTS N°29 • Ciclo 2026**

## Docente de la Materia
* **Emir Eliezer Garcia Ontiveros**

## Integrantes del Grupo 12:

- Marcos Artine
- Anahí Cardozo
- Ezequiel Cattalín
- Marisol Alcaraz
- Nancy Vargas

---

## Descripción del proyecto

TurnoFlex es una aplicación web y API REST para la gestión de turnos en un centro de atención médica. Permite administrar pacientes, profesionales (con sus especialidades) y turnos, reemplazando el registro manual en planillas y mensajería instantánea.

La aplicación está desarrollada con **Node.js y Express**, utiliza **MongoDB mediante Mongoose** para persistir pacientes, profesionales, especialidades y turnos, y **Pug** para renderizar la interfaz web. El código está organizado bajo una arquitectura en capas (**Rutas**, **Controladores** y **Modelos**) y puede probarse tanto desde el navegador como mediante herramientas como Postman o Thunder Client.

---

## Tecnologías utilizadas

- **Node.js** (Entorno de ejecución)
- **Express 5** (Framework de backend y enrutamiento)
- **Pug** (Motor de plantillas del lado del servidor)
- **MongoDB y Mongoose** (Persistencia de datos y modelos)
-  **Git / GitHub** (trol de versiones y repositorio del código)

---

## Estructura del proyecto

```text
back-turnera/
├── index.js
├── package.json
├── routes/
│   ├── usuariosRoutes.js
│   ├── pacientesRoutes.js
│   ├── profesionalesRoutes.js
│   ├── especialidadesRoutes.js
│   └── turnosRoutes.js
├── controllers/
│   ├── usuariosControllers.js
│   ├── pacientesControllers.js
│   ├── profesionalesControllers.js
│   ├── especialidadesControllers.js
│   └── turnosControllers.js
├── models/
│   ├── usuario.js
│   ├── paciente.js
│   ├── profesional.js
│   ├── especialidad.js
│   └── turno.js
├── config/
│   └── db.js
├── middleware/
│   └── autenticacion.js
├── public/
│   └── scripts/
│       └── script.js
└── views/
    ├── login.pug
    ├── layout.pug
    ├── listPacientes.pug
    ├── listProfesionales.pug
    ├── listEspecialidades.pug
    └── listTurnos.pug
```

Los formularios de alta y edición se muestran en la misma vista que el listado correspondiente.

## Identificadores y relaciones en MongoDB

Cada documento usa el campo `_id` que MongoDB genera automáticamente; ya no se crean identificadores numéricos propios. Las rutas reciben ese `_id` como una cadena hexadecimal. Las referencias se guardan como `ObjectId`: un profesional referencia una especialidad, y cada turno referencia un paciente, un profesional y una especialidad. Para mostrarlos en la interfaz se usa `populate()` de Mongoose.

Al crear un profesional, el campo `especialidad` debe contener el `_id` de una especialidad. Al crear un turno, `paciente` y `especialidad` deben contener sus respectivos `_id`; el servidor busca un profesional asignado a esa especialidad y guarda también su `_id`.

Ejemplo de cuerpo JSON para crear un turno:

```json
{
  "paciente": "ID_OBJECTID_DEL_PACIENTE",
  "especialidad": "ID_OBJECTID_DE_LA_ESPECIALIDAD",
  "fechaHora": "2026-10-20T10:30"
}
```
---

## Instalación y ejecución

1. Instalar dependencias:
```bash
npm install
```

2. Copiar `.env.example` a `.env` y configurar:
   - `MONGO_URI` para la conexión a MongoDB.
   - `SESSION_SECRET` con un valor aleatorio de al menos 32 caracteres.
   - `ADMIN_EMAIL` y `ADMIN_PASSWORD` para el administrador inicial. La contraseña debe tener al menos 12 caracteres.

3. Iniciar el servidor en modo desarrollo:
```bash
npm start
```

El servidor quedará disponible en `http://localhost:3000` (configurable mediante la variable de entorno `PORT`).
Antes de registrar profesionales o crear turnos, crea al menos una especialidad desde `/especialidades`.
Los registros que estén referenciados por turnos o profesionales no se pueden eliminar hasta quitar esas referencias.
El administrador se crea automáticamente la primera vez que inicia la aplicación; su contraseña se almacena con hash. Los profesionales pueden registrarse desde `/registro` y acceder únicamente a sus propios turnos en modo de consulta. La gestión de turnos y el resto de las páginas y API requieren iniciar sesión como administrador. Las sesiones se guardan en MongoDB.

Los formularios realizan sus solicitudes mediante `fetch` desde `public/scripts/script.js`. El registro público crea la ficha del profesional y su cuenta vinculada; requiere que exista previamente la especialidad elegida.

---

## Reglas de negocio del sistema

- **Cálculo automático de duración:** La hora de finalización (`fecha_hora_fin`) se calcula sumando la duración en minutos de la especialidad (`duracion_turno_default`).
- **Integridad referencial:** Solo se puede registrar un turno si el paciente, la especialidad y el profesional existen previamente en el sistema.
- **Normalización de texto:** Búsqueda flexible de nombres y apellidos sin distinción de mayúsculas ni tildes.
- **Doble respuesta (Dual Response):** Si la solicitud proviene de un navegador web redirige a la vista Pug correspondiente; si proviene de clientes API (Postman / Thunder Client) responde en formato JSON con su código de estado HTTP adecuado.
- **Estados de turnos:** Soporta estados `Reservado`, `Cancelado`, `Atendido` y `Completado`.
- *(En desarrollo para entrega final)*: Validación estricta para evitar turnos superpuestos de un mismo profesional o paciente (`409 Conflict`).

---

## Endpoints de la API

### Pacientes (`/pacientes`) y Profesionales (`/profesionales`)
- `GET /` — Lista general en vista Pug (`200 OK`)
- `GET /:id` — Obtiene detalle por ID (`200 OK` / `404 Not Found`)
- `POST /` — Crea un nuevo registro (`201 Created`)
- `PUT /:id` — Modifica un registro existente (`200 OK` / `404 Not Found`)
- `DELETE /:id/eliminar` — Elimina el registro (`200 OK` / `404 Not Found`)

### Especialidades (`/especialidades`)
- `GET /` — Lista en vista Pug o JSON según el encabezado `Accept`.
- `POST /` — Crea una especialidad.
- `GET /:id` — Obtiene una especialidad por su `_id`.
- `PUT /:id` — Actualiza una especialidad.
- `DELETE /:id/eliminar` — Elimina una especialidad si no tiene profesionales ni turnos asociados (`409 Conflict` si está referenciada).

### Turnos (`/turnos`)
- `GET /` — Página de inicio con la lista de turnos en Pug.
- `GET /turnos` — Lista de turnos en JSON; responde con Pug si se solicita HTML (`200 OK`). Los profesionales solo reciben los suyos.
- `GET /:id` — Turno específico por ID (`200 OK` / `404 Not Found`); los profesionales no pueden consultar turnos ajenos.
- `POST /` — Alta de turno con cálculo de horario, solo administrador (`201 Created` / `400 Bad Request`)
- `PUT /:id` — Edición de turno, solo administrador (`200 OK` / `400 Bad Request` / `404 Not Found`)
- `DELETE /:id/eliminar` — Cancelación/eliminación, solo administrador (`200 OK` / `404 Not Found`)

### Usuarios
- `GET /registro` y `POST /registro` — Alta pública de un profesional con su ficha y cuenta.
- `GET /login` y `POST /login` — Inicio de sesión para administradores y profesionales.
---

## Códigos de estado HTTP utilizados

- **200 OK** — Solicitud procesada correctamente (consultas, modificaciones y bajas).
- **201 Created** — Nuevo recurso creado y almacenado exitosamente en MongoDB.
- **400 Bad Request** — Error de validación: campos requeridos faltantes, fecha inválida o datos de entidades no coincidentes.
- **404 Not Found** — El registro buscado por ID no existe en la base de datos.
- **409 Conflict** — No se permite eliminar una entidad que todavía tenga referencias.

---

## Próximos Pasos

Seguiremos trabajando con el mismo entusiasmo y coordinación en las siguientes etapas del proyecto, incorporando las validaciones avanzadas, nuevas funcionalidades y la persistencia en base de datos para las próximas entregas.

---
