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
- **jsonwebtoken y cookie-parser** (Autenticación JWT en cookie)
- **express-rate-limit** (Límite de intentos en el inicio de sesión)
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
   - `JWT_SECRET` con un valor aleatorio y secreto de al menos 32 caracteres. Ya no se utiliza `SESSION_SECRET`.
   - `ADMIN_EMAIL` y `ADMIN_PASSWORD` para el administrador inicial. La contraseña debe tener al menos 12 caracteres y no superar 72 bytes UTF-8.

3. Iniciar el servidor en modo desarrollo:
```bash
npm start
```

El servidor quedará disponible en `http://localhost:3000` (configurable mediante la variable de entorno `PORT`).
Antes de registrar profesionales o crear turnos, crea al menos una especialidad desde `/especialidades`.
El administrador se crea automáticamente al iniciar la aplicación si todavía no existe; sus credenciales se leen de las variables `ADMIN_EMAIL` y `ADMIN_PASSWORD`, y la contraseña se almacena con hash bcrypt. Si ya existe, la contraseña configurada se usa para actualizarla cuando no coincide con la almacenada.
Los profesionales pueden registrarse desde `/registro`; el registro crea tanto su perfil como su cuenta vinculada. Una vez autenticados, pueden consultar solo sus propios turnos. La administración de pacientes, profesionales, especialidades y las operaciones de escritura de turnos está reservada al administrador. La autenticación se realiza mediante un JWT que vence a los 30 minutos.

Los formularios realizan sus solicitudes mediante `fetch` desde `public/scripts/script.js`. El navegador envía y recibe JSON para las operaciones de formulario; los endpoints también pueden consultarse con clientes como Postman o Thunder Client.

## Autenticación, JWT y cookies

### Elección del mecanismo

La aplicación tiene una interfaz web renderizada en el servidor y no necesita conservar datos de sesión cambiantes entre solicitudes. Por eso se eligió JWT: el servidor verifica una firma y la expiración del token en cada solicitud, sin guardar una sesión completa por usuario en MongoDB. Se mantiene una lista pequeña de identificadores revocados para que el logout sea efectivo; esto es un compromiso entre JWT y la revocación inmediata, no una autenticación completamente stateless. JWT no es automáticamente más seguro o mejor que una sesión tradicional.

El JWT se guarda en una cookie `httpOnly`, no en `localStorage` ni en código JavaScript. Así, los scripts del navegador no pueden leer directamente el token. La cookie usa `SameSite=Strict` y, en producción, `Secure` para exigir HTTPS. Como las cookies se envían automáticamente con solicitudes, `SameSite` reduce el riesgo de CSRF, pero no sustituye una protección CSRF dedicada si se amplían los clientes o los flujos entre sitios.

### Mecánica del inicio de sesión

1. `POST /login` valida el correo y compara la contraseña con el hash bcrypt guardado.
2. Si las credenciales son correctas, el servidor firma un JWT con algoritmo HS256. Incluye el identificador de usuario (`sub`), correo, rol y, para profesionales, el identificador de su perfil.
3. El servidor envía el token en la cookie `turnoflex.token`, con `httpOnly`, `SameSite=Strict`, `Secure` en producción y duración de 30 minutos. El JWT también tiene una expiración firmada de 30 minutos; la duración no se extiende automáticamente al usar la aplicación.
4. Antes de las rutas, el middleware valida la firma, el algoritmo permitido, la expiración, el formato de los datos y que el identificador del token no esté revocado. Si el token no es válido o venció, se elimina la cookie; las rutas protegidas redirigen navegaciones HTML al login y responden `401` a solicitudes API.
5. Las rutas administrativas además verifican el rol. Las consultas de turnos de profesionales se limitan al identificador de perfil firmado en el token.
6. `POST /logout` registra el identificador único del JWT (`jti`) como revocado en MongoDB y borra la cookie. El middleware consulta esa lista al validar los siguientes pedidos; un token copiado previamente deja de servir inmediatamente. MongoDB elimina los registros vencidos mediante un índice TTL. No hay renovación automática; al vencer, se debe iniciar sesión nuevamente.

`JWT_SECRET` debe permanecer fuera del repositorio y tener al menos 32 caracteres aleatorios. Si se configura o cambia, los tokens firmados con otro secreto dejan de ser válidos. Al pasar desde las antiguas sesiones, los usuarios deberán iniciar sesión de nuevo.
La revocación permite cerrar el token actual inmediatamente, a cambio de consultar MongoDB en cada solicitud autenticada; por eso esta implementación prioriza la revocación efectiva sobre la validación completamente stateless.

### Política de contraseñas

Las contraseñas nuevas deben tener al menos 12 caracteres y no superar 72 bytes UTF-8, el límite de bcrypt. Se aceptan frases largas y no se imponen reglas de composición de mayúsculas, números o símbolos, para favorecer claves memorables sin reducir su longitud. El formulario informa la política y el servidor vuelve a validarla; la regla también se aplica al administrador inicial y al esquema de usuario. Las contraseñas se almacenan con bcrypt, nunca en texto plano.

### Agenda y disponibilidad

Al crear o editar un turno, se seleccionan paciente, especialidad y profesional. La lista de profesionales se filtra por especialidad y el servidor vuelve a comprobar esa relación. El horario usa la zona IANA `America/Argentina/Buenos_Aires`, independientemente de la zona horaria del servidor.

Por ahora, solo se permiten turnos de lunes a viernes que comiencen y finalicen dentro del horario 09:00–17:00. No se bloquean feriados automáticamente. La duración se calcula con la duración predeterminada de la especialidad. Antes de guardar, se rechazan con `409 Conflict` los solapamientos con otro turno `Reservado` del mismo profesional o paciente; los turnos cancelados, atendidos o completados no ocupan disponibilidad.

Para evitar que solicitudes simultáneas reserven el mismo intervalo, el servidor adquiere bloqueos atómicos en MongoDB para el paciente y el profesional, comprueba los conflictos mientras los mantiene y los libera al terminar. Si no puede adquirirlos, responde `503 Service Unavailable` para permitir reintentar sin guardar un turno potencialmente duplicado.

### Límite de intentos de login

`POST /login` permite hasta 3 solicitudes fallidas desde una misma IP dentro de una ventana de 15 minutos. Los inicios de sesión exitosos no cuentan. Al superar el límite, el endpoint devuelve `429 Too Many Requests` con un mensaje para volver a intentar cuando se reinicie la ventana.

El limitador usa memoria local al proceso. Es suficiente para una instancia única, pero cada instancia tendría un contador independiente en un despliegue escalado; en ese caso se debe configurar un almacenamiento compartido y asegurar que el proxy entregue correctamente la IP real del cliente. Si se ejecuta detrás de un único proxy confiable, configurar Express con `app.set("trust proxy", 1)` permite identificar la IP original; ajustar el valor a la topología real y no confiar indiscriminadamente en encabezados enviados por clientes.

---

## Reglas de negocio del sistema

- **Cálculo automático de duración:** La hora de finalización (`fecha_hora_fin`) se calcula sumando la duración en minutos de la especialidad (`duracion_turno_default`).
- **Integridad referencial:** Solo se puede registrar un turno si existen el paciente, la especialidad y el profesional seleccionados, y el profesional pertenece a esa especialidad.
- **Normalización de texto:** Búsqueda flexible de nombres y apellidos sin distinción de mayúsculas ni tildes.
- **Respuestas para web y API:** Las consultas que aceptan HTML renderizan vistas Pug; las solicitudes de API reciben JSON. Las acciones iniciadas desde formularios pueden devolver una redirección para el navegador.
- **Estados de turnos:** Soporta estados `Reservado`, `Cancelado`, `Atendido` y `Completado`.
- **Control de acceso:** Las rutas protegidas requieren un JWT válido y no revocado; las acciones administrativas verifican además el rol. Las contraseñas se guardan con hash bcrypt.
- **Disponibilidad de agenda:** Turnos en horario laboral de Buenos Aires, con profesional explícito y sin solapamientos de turnos reservados para el mismo paciente o profesional.

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
- `POST /` — Alta de turno con cálculo de horario y profesional explícito, solo administrador (`201 Created` / `400 Bad Request` / `409 Conflict` por solapamiento)
- `PUT /:id` — Edición de turno, solo administrador (`200 OK` / `400 Bad Request` / `404 Not Found` / `409 Conflict` por solapamiento)
- `DELETE /:id/eliminar` — Cancelación/eliminación, solo administrador (`200 OK` / `404 Not Found`)

### Usuarios
- `GET /registro` y `POST /registro` — Alta pública de un profesional con su ficha y cuenta.
- `GET /login` y `POST /login` — Inicio de sesión para administradores y profesionales; si es válido, `POST /login` establece la cookie JWT.
- `POST /logout` — Elimina la cookie JWT del navegador.
---

## Códigos de estado HTTP utilizados

- **200 OK** — Solicitud procesada correctamente (consultas, modificaciones y bajas).
- **201 Created** — Nuevo recurso creado y almacenado exitosamente en MongoDB.
- **400 Bad Request** — Error de validación: campos requeridos faltantes, fecha inválida o datos de entidades no coincidentes.
- **401 Unauthorized** — Solicitud de API sin un JWT válido o credenciales incorrectas.
- **403 Forbidden** — JWT válido sin permisos de administrador para la operación solicitada.
- **409 Conflict** — Solapamiento de turnos o conflicto con datos ya existentes.
- **429 Too Many Requests** — Se excedió el límite de intentos de inicio de sesión.
- **503 Service Unavailable** — No se pudo obtener un bloqueo de agenda a tiempo o el turno cambió durante una edición concurrente.
- **404 Not Found** — El registro buscado por ID no existe en la base de datos.
- **204 No Content** — Eliminación exitosa de una especialidad sin contenido de respuesta.

---
