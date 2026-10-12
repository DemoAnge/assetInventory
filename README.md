# SGA-CO — Sistema de Gestión de Activos

**Versión 1.0.3**

Sistema web para registrar, ubicar, mover, mantener y reportar activos institucionales.

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

**Docker**

```bash
docker-compose up --build
```

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
| Node.js | http://localhost:4000 |

## Módulos

Dashboard, Activos, TI, Movimientos, Mantenimiento, Reportes, Documentos, Catálogos, Custodios, Ubicaciones y Usuarios.

Roles: `ADMIN`, `TI`, `CONTABILIDAD`, `AUDITOR`.
