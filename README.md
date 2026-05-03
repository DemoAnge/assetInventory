# SGA-CO — Sistema de Gestión de Activos

---

## Herramientas de desarrollo

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React + TypeScript + Vite | 18 / 5.2 / 5.3 |
| Estilos | Tailwind CSS | 3.4 |
| Formularios | React Hook Form + Zod | 7.52 |
| Backend API | Django + Django REST Framework | 4.2 / 3.15 |
| Notificaciones | Node.js + Express + Socket.io | 18 / 4.19 / 4.7 |
| Base de datos | MySQL | 8.0 |
| Contenedores | Docker + Docker Compose | latest |

---

## Arquitectura

```
Navegador (React + Vite :5173)
        │ HTTP/REST              │ WebSocket
        ▼                        ▼
Django API (:8000)        Node.js (:4000)
        │
        ▼
   MySQL 8.0 (:3306)
   BD: inventario_activos
```

**Roles disponibles:** `ADMIN` 

## Requisitos previos

- Python 3.12+
- Node.js 18+ y npm
- MySQL 8.0
- Docker y Docker Compose *(solo para la opción Docker)*

---

## Configuración de variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
# Django
DJANGO_SECRET_KEY=change-me-in-production
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# MySQL
DB_NAME=inventario_activos
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=127.0.0.1
DB_PORT=3306

# JWT
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=30
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# Cifrado AES-256
FIELD_ENCRYPTION_KEY=your-32-byte-base64-key-here

# MFA
MFA_ISSUER_NAME=CooperativaActivos

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Node.js
NODE_PORT=4000
NODE_URL=http://localhost:4000
NODE_JWT_SECRET=same-as-django-jwt-secret

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=noreply@cooperativa.com
EMAIL_HOST_PASSWORD=your-email-password
```

---

## Instrucciones para correr el sistema

### Opción A — Script automático

```bash
./start.sh
```

### Opción B — Manual (tres terminales)

**Terminal 1 — Django**
```bash
cd backend-django
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate --settings=config.settings.development
python manage.py runserver 0.0.0.0:8000 --settings=config.settings.development
```

**Terminal 2 — Node.js**
```bash
cd backend-node
npm install
npm run dev
```

**Terminal 3 — Frontend**
```bash
cd frontend
npm install
npm run dev
```

### Opción C — Docker Compose

```bash
docker-compose up --build
```

### URLs

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Django API | http://localhost:8000/api/v1/ |
| Node.js | http://localhost:4000 |

---

## Creación del superusuario

### Comando rápido (recomendado)

Crea el usuario admin y siembra los catálogos base. **Elimina todos los datos existentes.**

```bash
cd backend-django
source venv/bin/activate

python manage.py reset_and_seed --settings=config.settings.development
```

Credenciales resultantes:
```
Email:      admin@sgacop.com
Contraseña: Admin1234*
Rol:        ADMIN
MFA:        desactivado
```

### SQL — Verificar o actualizar usuario existente

```sql
USE inventario_activos;

-- Ver usuarios registrados
SELECT id, email, first_name, last_name, role, is_active, is_superuser
FROM users_customuser;

-- Promover usuario existente a ADMIN
UPDATE users_customuser
SET role = 'ADMIN',
    is_staff = 1,
    is_superuser = 1,
    is_active = 1
WHERE email = 'admin@sgacop.com';
```

---

## Acceso al sistema

1. Abre **http://localhost:5173**
2. Inicia sesión con `admin@sgacop.com` / `Admin1234*`
3. Si MFA está habilitado, ingresa el código de 6 dígitos de tu app autenticadora

---

## Mapa de navegación

```
/login                      ← Página de inicio de sesión (pública)
/unauthorized               ← Acceso denegado (pública)
│
└── / (requiere sesión iniciada)
    │
    ├── /dashboard          ← Panel principal con resumen del sistema
    │
    ├── /assets             ← Listado de activos institucionales
    │   └── /assets/:id     ← Detalle de un activo específico
    │
    ├── /movements          ← Traslados y bajas de activos
    │
    ├── /reports            ← Generación de reportes (PDF / Excel)
    │
    ├── /documents          ← Gestión de documentos
    │
    ├── /settings           ← Configuración personal del usuario
    │
    ├── /it                 ← Licencias de software y perfiles IT
    │   └── [ADMIN · TI]
    │
    ├── /maintenance        ← Planes y registros de mantenimiento
    │   └── [ADMIN · TI]
    │
    ├── /catalogs           ← Tipos de activo, marcas y modelos
    │   └── [ADMIN · TI]
    │
    ├── /custodians         ← Gestión de custodios y responsables
    │   └── [ADMIN · TI]
    │
    ├── /locations          ← Agencias, departamentos y áreas
    │   └── [ADMIN]
    │
    └── /users              ← Gestión de usuarios y roles
        └── [ADMIN]
```

