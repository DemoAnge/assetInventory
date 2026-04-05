#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Script de arranque en desarrollo (sin Docker)
# ─────────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Colores
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${GREEN}==> Inventario de Activos — Arranque Dev${NC}"

# 1. Copiar .env si no existe
if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo -e "${YELLOW}⚠  Archivo .env creado desde .env.example — configura tus variables.${NC}"
fi

# 2. Backend Django
echo -e "${GREEN}[1/3] Iniciando Django...${NC}"
cd "$ROOT/backend-django"
if [ ! -d "venv" ]; then
  python -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
else
  source venv/bin/activate
fi
python manage.py migrate --settings=config.settings.development
python manage.py runserver 0.0.0.0:8000 --settings=config.settings.development &
DJANGO_PID=$!

# 3. Backend Node
echo -e "${GREEN}[2/3] Iniciando Node.js...${NC}"
cd "$ROOT/backend-node"
[ ! -d "node_modules" ] && npm install
npm run dev &
NODE_PID=$!

# 4. Frontend
echo -e "${GREEN}[3/3] Iniciando Frontend React...${NC}"
cd "$ROOT/frontend"
[ ! -d "node_modules" ] && npm install
npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}✓ Sistema iniciado:${NC}"
echo "  • Django API:  http://localhost:8000/api/v1/"
echo "  • Node.js:     http://localhost:4000"
echo "  • Frontend:    http://localhost:5173"
echo ""
echo "Presiona Ctrl+C para detener todos los servicios."

trap "kill $DJANGO_PID $NODE_PID $FRONTEND_PID 2>/dev/null; echo 'Servicios detenidos.'" INT
wait
