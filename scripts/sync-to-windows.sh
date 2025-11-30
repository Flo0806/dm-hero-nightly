#!/bin/bash
# Convenience wrapper - runs the actual sync script from packages/app
exec "$(dirname "$0")/../packages/app/scripts/sync-to-windows.sh" "$@"
