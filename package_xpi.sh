#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="$SCRIPT_DIR/site_control_extension"
OUTPUT="$SCRIPT_DIR/site_control_extension.xpi"

if [ ! -d "$EXT_DIR" ]; then
  echo "Extension directory not found: $EXT_DIR" >&2
  exit 1
fi

python3 - "$EXT_DIR" "$OUTPUT" <<'PY'
import os
import sys
import zipfile

ext_dir, output = sys.argv[1], sys.argv[2]

if os.path.exists(output):
    os.remove(output)

with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, _, files in os.walk(ext_dir):
        for name in files:
            full = os.path.join(root, name)
            arcname = os.path.relpath(full, ext_dir)
            zf.write(full, arcname)

print(f"Created: {output}")
PY