#!/usr/bin/env bash
# BIMRAG platform orchestrator — starts all ecosystem services for local development.
#
# Usage:
#   ./start-platform.sh           Start all services (background)
#   ./start-platform.sh --demo    Start + seed sample data + health check
#   ./start-platform.sh --status  Show service health
#   ./start-platform.sh --stop    Stop all platform processes
#
# Configure sibling repo paths (clone ashishpatill/* repos alongside BIMWeb):
#   export BIMAGENT_DIR=../BIMAgent
#   export BIMINDEX_DIR=../BIMIndex
#   export BIMEXTRACT_DIR=../BIMExtract
#   export BIMCLOUD_DIR=../BIMCloud

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="${ROOT_DIR}/.platform-pids"
LOG_DIR="${ROOT_DIR}/.platform-logs"

BIMAGENT_DIR="${BIMAGENT_DIR:-${ROOT_DIR}/../BIMAgent}"
BIMINDEX_DIR="${BIMINDEX_DIR:-${ROOT_DIR}/../BIMIndex}"
BIMEXTRACT_DIR="${BIMEXTRACT_DIR:-${ROOT_DIR}/../BIMExtract}"
BIMCLOUD_DIR="${BIMCLOUD_DIR:-${ROOT_DIR}/../BIMCloud}"

BIMAGENT_PORT="${BIMAGENT_PORT:-8000}"
BIMINDEX_PORT="${BIMINDEX_PORT:-8001}"
BIMEXTRACT_PORT="${BIMEXTRACT_PORT:-8200}"
BIMCLOUD_PORT="${BIMCLOUD_PORT:-8080}"
BIMWEB_PORT="${BIMWEB_PORT:-3000}"

MOCKS_DIR="${ROOT_DIR}/scripts/mocks"
USE_MOCKS="${USE_MOCKS:-1}"

mkdir -p "$PID_DIR" "$LOG_DIR"

log() { printf '[platform] %s\n' "$*"; }
warn() { printf '[platform] WARN: %s\n' "$*" >&2; }

health_url() {
  local url="$1"
  curl -sf --max-time 3 "$url" >/dev/null 2>&1
}

write_pid() {
  local name="$1"
  local pid="$2"
  echo "$pid" > "${PID_DIR}/${name}.pid"
}

read_pid() {
  local name="$1"
  local file="${PID_DIR}/${name}.pid"
  if [[ -f "$file" ]]; then
    cat "$file"
  fi
}

stop_service() {
  local name="$1"
  local pid
  pid="$(read_pid "$name" || true)"
  if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
    log "Stopping $name (pid $pid)"
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
  rm -f "${PID_DIR}/${name}.pid"
}

stop_all() {
  for svc in bimweb bimcloud bimextract bimindex bimagent; do
    stop_service "$svc"
  done
  log "All platform services stopped."
}

start_node_mock() {
  local name="$1"
  local script="$2"
  local port="$3"
  local extra_env="${4:-}"

  if [[ ! -f "$script" ]]; then
    warn "Mock script not found: $script"
    return 1
  fi

  local log_file="${LOG_DIR}/${name}.log"
  log "Starting $name mock on :$port (log: $log_file)"
  (
    cd "$ROOT_DIR"
    # shellcheck disable=SC2086
    PORT="$port" $extra_env node "$script" >>"$log_file" 2>&1
  ) &
  write_pid "$name" "$!"
  return 0
}

start_python_service() {
  local name="$1"
  local dir="$2"
  local port="$3"
  local cmd="$4"

  if [[ ! -d "$dir" ]]; then
    warn "$name repo not found at $dir — skipping"
    return 1
  fi

  local log_file="${LOG_DIR}/${name}.log"
  log "Starting $name on :$port (log: $log_file)"
  (
    cd "$dir"
    # shellcheck disable=SC2086
    eval "$cmd" >>"$log_file" 2>&1
  ) &
  write_pid "$name" "$!"
  return 0
}

start_bimagent() {
  start_python_service "bimagent" "$BIMAGENT_DIR" "$BIMAGENT_PORT" \
    "python -m uvicorn app.main:app --host 127.0.0.1 --port ${BIMAGENT_PORT}"
}

start_bimindex() {
  start_python_service "bimindex" "$BIMINDEX_DIR" "$BIMINDEX_PORT" \
    "PYTHONPATH=. python -m uvicorn server:app --host 127.0.0.1 --port ${BIMINDEX_PORT}"
}

start_bimextract() {
  if [[ -f "${BIMEXTRACT_DIR}/server.py" ]]; then
    start_python_service "bimextract" "$BIMEXTRACT_DIR" "$BIMEXTRACT_PORT" \
      "python -m uvicorn server:app --host 127.0.0.1 --port ${BIMEXTRACT_PORT}"
    return $?
  fi
  if [[ -f "${BIMEXTRACT_DIR}/ultra_cost_optimized_pipeline/src/pipeline/runpod_langchain_api.py" ]]; then
    warn "BIMExtract ecosystem server.py not found — using legacy runpod API"
    start_python_service "bimextract" "$BIMEXTRACT_DIR" "$BIMEXTRACT_PORT" \
      "cd ultra_cost_optimized_pipeline/src/pipeline && python -m uvicorn runpod_langchain_api:app --host 127.0.0.1 --port ${BIMEXTRACT_PORT}"
    return $?
  fi
  if [[ "$USE_MOCKS" == "1" ]]; then
    start_node_mock "bimextract" "${MOCKS_DIR}/bimextract.mjs" "$BIMEXTRACT_PORT"
    return $?
  fi
  warn "BIMExtract API entrypoint not found — skipping"
  return 1
}

start_bimcloud() {
  if [[ -f "${BIMCLOUD_DIR}/server.py" ]] || [[ -f "${BIMCLOUD_DIR}/app/main.py" ]]; then
    local module="server:app"
    [[ -f "${BIMCLOUD_DIR}/app/main.py" ]] && module="app.main:app"
    start_python_service "bimcloud" "$BIMCLOUD_DIR" "$BIMCLOUD_PORT" \
      "python -m uvicorn ${module} --host 127.0.0.1 --port ${BIMCLOUD_PORT}"
    return $?
  fi
  if [[ "$USE_MOCKS" == "1" ]]; then
    start_node_mock "bimcloud" "${MOCKS_DIR}/bimcloud.mjs" "$BIMCLOUD_PORT" \
      "BIMAGENT_URL=http://127.0.0.1:${BIMAGENT_PORT}"
    return $?
  fi
  warn "BIMCloud repo not found at $BIMCLOUD_DIR — gateway will be offline in BIMWeb"
  return 1
}

start_bimweb() {
  if command -v pnpm >/dev/null 2>&1; then
    log "Starting BIMWeb on :${BIMWEB_PORT} (log: ${LOG_DIR}/bimweb.log)"
    (
      cd "$ROOT_DIR"
      PORT="$BIMWEB_PORT" pnpm dev >>"${LOG_DIR}/bimweb.log" 2>&1
    ) &
    write_pid "bimweb" "$!"
  else
    warn "pnpm not found — start BIMWeb manually with: pnpm dev"
    return 1
  fi
}

wait_for_health() {
  local name="$1"
  local url="$2"
  local attempts="${3:-30}"
  for ((i = 1; i <= attempts; i++)); do
    if health_url "$url"; then
      log "$name healthy at $url"
      return 0
    fi
    sleep 1
  done
  warn "$name did not become healthy at $url (see ${LOG_DIR}/${name}.log)"
  return 1
}

show_status() {
  log "Service status:"
  printf '  BIMAgent   :%s  %s\n' "$BIMAGENT_PORT" "$(health_url "http://127.0.0.1:${BIMAGENT_PORT}/health" && echo OK || echo OFFLINE)"
  printf '  BIMIndex   :%s  %s\n' "$BIMINDEX_PORT" "$(health_url "http://127.0.0.1:${BIMINDEX_PORT}/health" && echo OK || echo OFFLINE)"
  printf '  BIMExtract :%s  %s\n' "$BIMEXTRACT_PORT" "$(health_url "http://127.0.0.1:${BIMEXTRACT_PORT}/health" && echo OK || echo OFFLINE)"
  printf '  BIMCloud   :%s  %s\n' "$BIMCLOUD_PORT" "$(health_url "http://127.0.0.1:${BIMCLOUD_PORT}/health" && echo OK || echo OFFLINE)"
  printf '  BIMWeb     :%s  %s\n' "$BIMWEB_PORT" "$(health_url "http://127.0.0.1:${BIMWEB_PORT}" && echo OK || echo OFFLINE)"
}

run_demo_seed() {
  if [[ -f "${BIMINDEX_DIR}/run-scenarios.sh" ]]; then
    log "Running BIMIndex demo scenarios..."
    (cd "$BIMINDEX_DIR" && ./run-scenarios.sh) || warn "run-scenarios.sh failed"
  else
    log "Seeding BIMIndex with sample documents..."
    curl -sf -X POST "http://127.0.0.1:${BIMINDEX_PORT}/ingest" \
      -H "Content-Type: application/json" \
      -d '{"documents":[{"title":"Fire Rating Spec","text":"Floor 3 curtain wall requires 60-minute fire rating per IBC."},{"title":"Structural Report","text":"Steel frame analysis for Tower A levels 1-5."}]}' \
      >/dev/null 2>&1 || warn "BIMIndex ingest seed failed"
  fi

  if health_url "http://127.0.0.1:${BIMCLOUD_PORT}/health"; then
    curl -sf -X POST "http://127.0.0.1:${BIMCLOUD_PORT}/query" \
      -H "Content-Type: application/json" \
      -d '{"query":"fire rating floor 3","user_id":"demo"}' \
      >/dev/null 2>&1 && log "BIMCloud test query OK" || warn "BIMCloud test query failed"
  fi
}

start_all() {
  log "BIMRAG platform starting from $ROOT_DIR"
  start_bimindex || true
  start_bimextract || true
  start_bimagent || true
  start_bimcloud || true

  sleep 2
  wait_for_health "bimindex" "http://127.0.0.1:${BIMINDEX_PORT}/health" 20 || true
  wait_for_health "bimagent" "http://127.0.0.1:${BIMAGENT_PORT}/health" 20 || true
  wait_for_health "bimextract" "http://127.0.0.1:${BIMEXTRACT_PORT}/health" 20 || true
  wait_for_health "bimcloud" "http://127.0.0.1:${BIMCLOUD_PORT}/health" 15 || true

  show_status
  log "Set in .env.local:"
  log "  NEXT_PUBLIC_BIMAGENT_URL=http://localhost:${BIMAGENT_PORT}"
  log "  NEXT_PUBLIC_BIMINDEX_URL=http://localhost:${BIMINDEX_PORT}"
  log "  NEXT_PUBLIC_BIMEXTRACT_URL=http://localhost:${BIMEXTRACT_PORT}"
  log "  NEXT_PUBLIC_BIMCLOUD_URL=http://localhost:${BIMCLOUD_PORT}"
  log "Start BIMWeb separately: pnpm dev  (or pass --with-web)"
}

case "${1:-}" in
  --stop)
    stop_all
    ;;
  --status)
    show_status
    ;;
  --demo)
    start_all
    run_demo_seed
    show_status
    ;;
  --with-web)
    start_all
    start_bimweb || true
    ;;
  "")
    start_all
    ;;
  *)
    echo "Usage: $0 [--demo|--status|--stop|--with-web]" >&2
    exit 1
    ;;
esac
