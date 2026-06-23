#!/bin/bash

# ══════════════════════════════════════════════════════════════════════
#  Unified Startup Script — All Services
#  Starts: Streaming API (5001) | Pipeline FastAPI (8080) | React UI (5173)
# ══════════════════════════════════════════════════════════════════════

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# PID tracking
STREAMING_PID=""
PIPELINE_PID=""
FRONTEND_PID=""

# ── Cleanup on exit ──────────────────────────────────────────────────
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down all services...${NC}"
    [ -n "$STREAMING_PID" ] && kill "$STREAMING_PID" 2>/dev/null && echo "   Stopped Streaming API (PID $STREAMING_PID)"
    [ -n "$PIPELINE_PID" ] && kill "$PIPELINE_PID" 2>/dev/null && echo "   Stopped Pipeline API (PID $PIPELINE_PID)"
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && echo "   Stopped Frontend (PID $FRONTEND_PID)"
    # Also kill any leftover child processes
    pkill -f "api_server_streaming.py" 2>/dev/null
    pkill -f "pipeline.api_server" 2>/dev/null
    pkill -f "vite.*transcript-ui" 2>/dev/null
    echo -e "${GREEN}✅ All services stopped.${NC}"
    exit 0
}

trap cleanup INT TERM EXIT

# ── Kill stale processes from previous runs ──────────────────────────
echo -e "${CYAN}🧹 Cleaning up stale processes...${NC}"
pkill -f "api_server_streaming.py" 2>/dev/null || true
pkill -f "pipeline.api_server" 2>/dev/null || true
pkill -f "vite.*transcript-ui" 2>/dev/null || true
sleep 1

# ── Pre-flight checks ───────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════════════"
echo -e "  ${CYAN}🚀 Starting Transcript AI System${NC}"
echo "══════════════════════════════════════════════════════════════════"
echo ""

# Check .env file
if [ ! -f "$ROOT_DIR/.env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "   Create a .env file with at least: ELEVENLABS_API_KEY=your_key"
    exit 1
fi

# Check Python
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}❌ python3 not found. Please install Python 3.10+${NC}"
    exit 1
fi

# Check Node.js
if ! command -v node &>/dev/null; then
    echo -e "${RED}❌ node not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check frontend dependencies
if [ ! -d "$ROOT_DIR/transcript-ui/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    (cd "$ROOT_DIR/transcript-ui" && npm install)
fi

# Check Ollama is reachable (needed for pipeline)
OLLAMA_URL="${OLLAMA_BASE_URL:-http://localhost:11434}"
if curl -s --connect-timeout 3 "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama reachable at $OLLAMA_URL${NC}"
else
    echo -e "${YELLOW}⚠️  Ollama not reachable at $OLLAMA_URL — pipeline analysis will be unavailable${NC}"
    echo "   Start Ollama with: ollama serve"
fi

echo ""

# ══════════════════════════════════════════════════════════════════════
#  1. Streaming API Server (Flask + SocketIO) — port 5001
# ══════════════════════════════════════════════════════════════════════
echo -e "${CYAN}📡 [1/3] Starting Streaming API server on port 5001...${NC}"
"$ROOT_DIR/venv/bin/python" "$ROOT_DIR/api_server_streaming.py" > /tmp/streaming_api.log 2>&1 &
STREAMING_PID=$!
echo "   PID: $STREAMING_PID"

# Wait for streaming API to be ready
for i in {1..15}; do
    if curl -s http://localhost:5001/api/health >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Streaming API ready${NC}"
        break
    fi
    if [ "$i" -eq 15 ]; then
        echo -e "   ${YELLOW}⚠️  Streaming API may still be loading (check /tmp/streaming_api.log)${NC}"
    fi
    sleep 1
done

# ══════════════════════════════════════════════════════════════════════
#  2. Pipeline FastAPI Server (Uvicorn) — port 8080
# ══════════════════════════════════════════════════════════════════════
echo -e "${CYAN}🤖 [2/3] Starting Pipeline API server on port 8080...${NC}"
"$ROOT_DIR/venv/bin/python" -m uvicorn pipeline.api_server:app \
    --host 0.0.0.0 \
    --port 8080 \
    --log-level warning \
    --workers 1 > /tmp/pipeline_api.log 2>&1 &
PIPELINE_PID=$!
echo "   PID: $PIPELINE_PID"

# Wait for pipeline API to be ready
for i in {1..15}; do
    if curl -s http://localhost:8080/health >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Pipeline API ready${NC}"
        break
    fi
    if [ "$i" -eq 15 ]; then
        echo -e "   ${YELLOW}⚠️  Pipeline API may still be loading (check /tmp/pipeline_api.log)${NC}"
    fi
    sleep 1
done

# ══════════════════════════════════════════════════════════════════════
#  3. React Frontend (Vite) — port 5173
# ══════════════════════════════════════════════════════════════════════
echo -e "${CYAN}🎨 [3/3] Starting React UI on port 5173...${NC}"
(cd "$ROOT_DIR/transcript-ui" && npm run dev -- --host) > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   PID: $FRONTEND_PID"

# Wait for frontend to be ready
for i in {1..15}; do
    if curl -s http://localhost:5173 >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ React UI ready${NC}"
        break
    fi
    if [ "$i" -eq 15 ]; then
        echo -e "   ${YELLOW}⚠️  React UI may still be loading (check /tmp/frontend.log)${NC}"
    fi
    sleep 1
done

# ══════════════════════════════════════════════════════════════════════
#  All services started
# ══════════════════════════════════════════════════════════════════════
echo ""
echo "══════════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}✅ All services are running!${NC}"
echo "══════════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${CYAN}🎨 Frontend UI:${NC}        http://localhost:5173"
echo -e "  ${CYAN}📡 Streaming API:${NC}      http://localhost:5001"
echo -e "  ${CYAN}🤖 Pipeline API:${NC}       http://localhost:8080"
echo -e "  ${CYAN}📖 Pipeline Docs:${NC}      http://localhost:8080/docs"
echo ""
echo "  Logs:"
echo "    Streaming API → /tmp/streaming_api.log"
echo "    Pipeline API  → /tmp/pipeline_api.log"
echo "    Frontend      → /tmp/frontend.log"
echo ""
echo -e "  Press ${RED}Ctrl+C${NC} to stop all services"
echo "══════════════════════════════════════════════════════════════════"

# Keep the script alive — wait for any child to exit
wait $STREAMING_PID $PIPELINE_PID $FRONTEND_PID
