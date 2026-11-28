"""Durable JSONL ingestion, event-time windows and a SQLite queryable sink."""

import json
import sqlite3
from contextlib import closing


def ingest(path, lines, size=10, delay=4):
    if size < 1 or delay < 0:
        raise ValueError("invalid window policy")
    with closing(sqlite3.connect(path)) as db, db:
        db.execute("CREATE TABLE IF NOT EXISTS run (id TEXT PRIMARY KEY, start INTEGER, total INTEGER, event_time INTEGER, status TEXT)")
        db.execute("CREATE TABLE IF NOT EXISTS policy (size INTEGER, delay INTEGER)")
        current = db.execute("SELECT size, delay FROM policy").fetchone()
        if current is None:
            db.execute("INSERT INTO policy VALUES (?,?)", (size, delay))
        elif current != (size, delay):
            raise ValueError("existing database uses a different window policy")
        latest = db.execute("SELECT MAX(event_time) FROM run").fetchone()[0]
        counts = dict(accepted=0, duplicate=0, late=0, invalid=0, conflict=0)
        for line in lines:
            try:
                event = json.loads(line)
                event_id, when, value = event["id"], event["time"], event["value"]
                if not isinstance(event_id, str) or not 0 < len(event_id) <= 80 or type(when) is not int or not 0 <= when <= 10**8 or type(value) is not int or not -10**8 <= value <= 10**8:
                    raise ValueError("invalid event values")
            except (ValueError, KeyError, TypeError):
                counts["invalid"] += 1
                continue
            old = db.execute("SELECT event_time,total FROM run WHERE id=?", (event_id,)).fetchone()
            if old is not None:
                counts["duplicate" if old == (when,value) else "conflict"] += 1
                continue
            start = when // size * size
            status = "late" if latest is not None and start + size <= latest-delay else "accepted"
            latest = when if latest is None else max(latest,when)
            counts[status] += 1
            db.execute("INSERT INTO run VALUES (?,?,?,?,?)", (event_id,start,value,when,status))
        result = db.execute("SELECT start, COUNT(*), SUM(total) FROM run WHERE status='accepted' GROUP BY start ORDER BY start").fetchall()
        lineage = db.execute("SELECT id,start,status FROM run ORDER BY id").fetchall()
        return {"counts":counts,"windows":result,"lineage":lineage,"watermark":None if latest is None else latest-delay}
