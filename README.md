# SGA-CO — Sistema de Gestión de Activos

**Versión 1.0.3**

Sistema web para registrar, ubicar, mover, mantener y reportar activos institucionales.

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
```

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| API | Django + Django REST Framework |
| Notificaciones | Node.js, Express, Socket.io |
| Base de datos | MySQL 8.0 |
| Contenedores | Docker Compose |

## Arranque

Requisitos: Python 3.12+, Node.js 18+, MySQL 8.0.

Copia `.env.example` a `.env` y completa los valores locales.

**Script**

```bash
./start.sh
```

**Docker (desarrollo)**

```bash
docker compose up --build
```

**Docker (producción local)**

```bash
docker compose -f docker-compose.prod.yml up --build
```

Sirve el frontend en http://localhost (nginx :80). `/api` y `/media` van a Django; `/socket.io` a Node. Django corre con gunicorn y WhiteNoise.

**Manual (tres terminales)**

```bash
# Django
cd backend-django
python -m venv venv
venv\Scripts\Activate.ps1          # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate --settings=config.settings.development
python manage.py runserver 0.0.0.0:8000 --settings=config.settings.development

# Node.js
cd backend-node
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Django API | http://localhost:8000/api/v1/ |
| Django health | http://localhost:8000/api/v1/health/ |
| Node.js | http://localhost:4000 |
| Node health | http://localhost:4000/health |

## Tests

```bash
# Django (sqlite, sin MySQL)
cd backend-django
pytest

# Frontend (política de roles)
cd frontend
npm test
npm run lint
```

## Módulos

Dashboard, Activos, TI, Movimientos, Mantenimiento, Reportes, Documentos, Catálogos, Custodios, Ubicaciones y Usuarios.

Roles: `ADMIN`, `TI`, `CONTABILIDAD`, `AUDITOR`.


