#!/usr/bin/env bash
set -e
LOG="logs/task_log.json"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
STEP="$1"
STATUS="$2"
DETAILS="$3"

# Create logs directory if it doesn't exist
mkdir -p "$(dirname "$LOG")"

echo "{\"ts\":\"$TS\",\"step\":\"$STEP\",\"status\":\"$STATUS\",\"details\":\"$DETAILS\"}" >> "$LOG"