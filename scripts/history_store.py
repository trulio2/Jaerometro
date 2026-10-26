"""Local store for source data, so each run only fetches what is new.

Series sources keep every row ever fetched in ``history/<key>.json``; one-off
values keep their last good copy in ``latest/<key>.json``. When a source fails
the stored copy is used instead and the source is reported as stale.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace(
        "+00:00", "Z"
    )


def _write_rows(path: Path, key: str, updated_at: str, rows: list[list]):
    # One row per line keeps the git diff of a daily run small and readable.
    body = ",\n".join(
        "    " + json.dumps(row, ensure_ascii=False) for row in rows
    )
    path.write_text(
        "{\n"
        f'  "key": {json.dumps(key)},\n'
        f'  "updatedAt": {json.dumps(updated_at)},\n'
        '  "rows": [\n'
        f"{body}\n"
        "  ]\n"
        "}\n",
        encoding="utf-8",
    )


class HistoryStore:
    def __init__(self, root: Path):
        self.history_dir = root / "history"
        self.latest_dir = root / "latest"
        self.history_dir.mkdir(parents=True, exist_ok=True)
        self.latest_dir.mkdir(parents=True, exist_ok=True)
        self.sources: dict[str, dict[str, Any]] = {}

    def _read(self, path: Path) -> dict | None:
        if not path.exists():
            return None

        return json.loads(path.read_text(encoding="utf-8"))

    def _mark(self, key: str, status: str, updated_at: str | None, error=None):
        entry = {"status": status, "updatedAt": updated_at}

        if error is not None:
            entry["error"] = f"{type(error).__name__}: {error}"[:300]

        self.sources[key] = entry

    def series(
        self,
        key: str,
        fetch: Callable[[str | None, str | None], list[list]],
    ) -> list[list]:
        """Merge freshly fetched rows into the stored series for ``key``.

        ``fetch`` receives the first and last stored dates (both ``None`` on
        the first run) and returns rows whose first item is an ISO date. Rows
        for a date that is already stored replace it, which picks up revised
        figures.
        """
        path = self.history_dir / f"{key}.json"
        stored = self._read(path)
        rows = {row[0]: row for row in (stored or {}).get("rows", [])}
        first = min(rows) if rows else None
        last = max(rows) if rows else None

        try:
            fresh = fetch(first, last)
        except Exception as error:
            if not rows:
                self._mark(key, "missing", None, error)
                raise

            self._mark(key, "stale", stored.get("updatedAt"), error)
            print(f"[stale] {key}: {error}")
            return [rows[date] for date in sorted(rows)]

        for row in fresh:
            rows[row[0]] = row

        updated_at = _now()
        merged = [rows[date] for date in sorted(rows)]
        _write_rows(path, key, updated_at, merged)
        self._mark(key, "ok", updated_at)
        return merged

    def latest(self, key: str, fetch: Callable[[], Any], default=None):
        """Return a fresh value for ``key``, or the last good one on failure.

        ``fetch`` signals "no usable value" by raising or returning ``None``.
        """
        path = self.latest_dir / f"{key}.json"

        try:
            value = fetch()

            if value is None:
                raise ValueError("empty response")
        except Exception as error:
            stored = self._read(path)

            if stored is None:
                self._mark(key, "missing", None, error)
                print(f"[missing] {key}: {error}")
                return default

            self._mark(key, "stale", stored.get("updatedAt"), error)
            print(f"[stale] {key}: {error}")
            return stored["value"]

        updated_at = _now()
        path.write_text(
            json.dumps(
                {"key": key, "updatedAt": updated_at, "value": value},
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        self._mark(key, "ok", updated_at)
        return value
