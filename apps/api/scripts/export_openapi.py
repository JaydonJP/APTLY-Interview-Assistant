"""
APTLY API — OpenAPI Schema Exporter

Exports the current OpenAPI JSON specification from the FastAPI app.
This is the single source of truth for all HTTP API contracts.

Usage:
    python scripts/export_openapi.py [output_path]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import create_app


def export_openapi(output_path: str = "openapi.json") -> None:
    """Generate and write the OpenAPI JSON specification."""
    app = create_app()
    openapi_schema = app.openapi()

    out = Path(output_path).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    with open(out, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)

    print(f"[OK] OpenAPI schema exported successfully to: {out}")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "openapi.json"
    export_openapi(target)
