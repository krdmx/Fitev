#!/bin/sh
set -eu

N8N_DATA_DIR="${N8N_USER_FOLDER:-/home/node/.n8n}"
MARKER_FILE="$N8N_DATA_DIR/.project-seed-imported"
WORKFLOW_FILE="/seed/workflow.json"

mkdir -p "$N8N_DATA_DIR"

if [ "${N8N_IMPORT_SEED:-true}" = "true" ] && [ -f "$WORKFLOW_FILE" ] && [ ! -f "$MARKER_FILE" ]; then
  echo "Importing project workflow seed into n8n..."
  n8n import:workflow --input="$WORKFLOW_FILE"
  date -u +"%Y-%m-%dT%H:%M:%SZ" > "$MARKER_FILE"
fi

exec n8n start
