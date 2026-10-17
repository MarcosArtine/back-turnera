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
- **express-session y connect-mongo** (Autenticación por sesiones persistidas en MongoDB)
- **bcryptjs** (Hash de contraseñas)
- **Git / GitHub** (Control de versiones y repositorio del código)

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
│   ├── scripts/
│   │   └── script.js
│   └── styles/
│       └── style.css
└── views/
    ├── register.pug
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
El administrador se crea automáticamente al iniciar la aplicación si todavía no existe; sus credenciales se leen de las variables `ADMIN_EMAIL` y `ADMIN_PASSWORD`, y la contraseña se almacena con hash bcrypt. Si ya existe, la contraseña configurada se usa para actualizarla cuando no coincide con la almacenada.
Los profesionales pueden registrarse desde `/registro`; el registro crea tanto su perfil como su cuenta vinculada. Una vez autenticados, pueden consultar solo sus propios turnos. La administración de pacientes, profesionales, especialidades y las operaciones de escritura de turnos está reservada al administrador. Las sesiones se guardan en MongoDB y vencen tras ocho horas de inactividad.

Los formularios realizan sus solicitudes mediante `fetch` desde `public/scripts/script.js`. El navegador envía y recibe JSON para las operaciones de formulario; los endpoints también pueden consultarse con clientes como Postman o Thunder Client.

---

## Reglas de negocio del sistema

- **Cálculo automático de duración:** La hora de finalización (`fecha_hora_fin`) se calcula sumando la duración en minutos de la especialidad (`duracion_turno_default`).
- **Integridad referencial:** Solo se puede registrar un turno si existen el paciente y la especialidad seleccionados y hay un profesional asociado a esa especialidad. El servidor asigna ese profesional al turno.
- **Normalización de texto:** Búsqueda flexible de nombres y apellidos sin distinción de mayúsculas ni tildes.
- **Respuestas para web y API:** Las consultas que aceptan HTML renderizan vistas Pug; las solicitudes de API reciben JSON. Las acciones iniciadas desde formularios pueden devolver una redirección para el navegador.
- **Estados de turnos:** Soporta estados `Reservado`, `Cancelado`, `Atendido` y `Completado`.
- **Control de acceso:** Las rutas protegidas requieren sesión; las acciones administrativas verifican además el rol. Las contraseñas de las cuentas se guardan con hash y no en texto plano.

---

## Próximas mejoras

Las siguientes propuestas describen posibles iteraciones; no están implementadas en la versión actual. Se priorizarán según los requisitos de la próxima entrega:

1. **Evitar superposición de turnos.** Antes de crear o modificar un turno, comprobar que el intervalo solicitado no se cruce con otro turno activo del mismo profesional ni con otro turno del mismo paciente. La comprobación debe considerar la duración configurada para la especialidad, excluir el turno que se está editando y responder `409 Conflict` cuando haya una colisión. También conviene proteger la regla ante solicitudes simultáneas.
2. **Fortalecer la política de contraseñas.** Además del mínimo actual de 8 caracteres para el registro profesional (y 12 para el administrador inicial), evaluar requisitos de composición, mensajes accesibles en el formulario y límites coherentes con bcrypt. Las mismas reglas deberán aplicarse en el servidor, no solo en la interfaz.
3. **Definir la estrategia de autenticación según los clientes.** El proyecto usa actualmente sesiones persistidas en MongoDB, apropiadas para la interfaz web. Si se incorporan clientes móviles o una API consumida por terceros, evaluar autenticación basada en tokens (por ejemplo, JWT), expiración y renovación, revocación, almacenamiento seguro y separación de permisos, evitando mantener dos mecanismos sin una necesidad concreta.
4. **Mejorar la gestión de agenda.** Permitir seleccionar explícitamente al profesional cuando haya más de uno para una especialidad y considerar disponibilidad, horarios de atención, feriados, cancelaciones y cambios de turno. Mostrar los horarios en una zona horaria definida para evitar ambigüedades.


---

## Endpoints de la API

### Pacientes (`/pacientes`) y Profesionales (`/profesionales`)
- `GET /` — Lista en Pug para navegador o JSON para clientes API (`200 OK`)
- `GET /:id` — Obtiene detalle por ID (`200 OK` / `404 Not Found`)
- `POST /` — Crea un nuevo registro (`201 Created`)
- `PUT /:id` — Modifica un registro existente (`200 OK` / `404 Not Found`)
- `DELETE /:id/eliminar` — Elimina el registro (`200 OK` / `404 Not Found` / `409 Conflict` si está referenciado)

### Especialidades (`/especialidades`)
- `GET /` — Lista en vista Pug o JSON según el encabezado `Accept`.
- `POST /` — Crea una especialidad (`201 Created`).
- `GET /:id` — Obtiene una especialidad por su `_id` (`200 OK` / `404 Not Found`).
- `PUT /:id` — Actualiza una especialidad (`200 OK` / `404 Not Found`).
- `DELETE /:id/eliminar` — Elimina una especialidad si no tiene profesionales ni turnos asociados (`409 Conflict` si está referenciada).

### Turnos (`/turnos`)
- `GET /` — Lista los turnos en Pug o JSON según la solicitud (`200 OK`). Los profesionales solo reciben los suyos.
- `GET /:id` — Turno específico por ID (`200 OK` / `404 Not Found`); los profesionales no pueden consultar turnos ajenos.
- `POST /` — Alta de turno con cálculo de horario, solo administrador (`201 Created` / `400 Bad Request`)
- `PUT /:id` — Edición de turno, solo administrador (`200 OK` / `400 Bad Request` / `404 Not Found`)
- `DELETE /:id/eliminar` — Cancelación/eliminación, solo administrador (`200 OK` / `404 Not Found`)

### Usuarios
- `GET /registro` y `POST /registro` — Alta pública de un profesional con su ficha y cuenta.
- `GET /login` y `POST /login` — Inicio de sesión para administradores y profesionales.
- `POST /logout` — Cierre de sesión.
---

## Códigos de estado HTTP utilizados

- **200 OK** — Solicitud procesada correctamente (consultas, modificaciones y bajas).
- **201 Created** — Nuevo recurso creado y almacenado exitosamente en MongoDB.
- **400 Bad Request** — Error de validación: campos requeridos faltantes, fecha inválida o datos de entidades no coincidentes.
- **401 Unauthorized** — Solicitud de API sin una sesión válida o credenciales incorrectas.
- **403 Forbidden** — Sesión válida sin permisos de administrador para la operación solicitada.
- **404 Not Found** — El registro buscado por ID no existe en la base de datos.
- **409 Conflict** — No se puede eliminar una entidad referenciada o se intenta registrar un correo ya utilizado.
- **204 No Content** — Eliminación exitosa de una especialidad sin contenido de respuesta.

---
