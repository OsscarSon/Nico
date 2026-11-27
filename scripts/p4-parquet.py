"""External P4 exercise. Run with Python and DuckDB 1.x. Uses only synthetic data."""

from pathlib import Path
from tempfile import TemporaryDirectory
from time import perf_counter

import duckdb


def main():
    with TemporaryDirectory(prefix="nico-parquet-") as work:
        parquet = str(Path(work) / "events.parquet")
        with duckdb.connect(":memory:") as db:
            db.execute("""
                CREATE TABLE events AS
                SELECT i AS id, i % 4 AS region, i % 11 AS amount
                FROM range(10000) AS numbers(i)
            """)
            db.execute("COPY events TO ? (FORMAT PARQUET, ROW_GROUP_SIZE 2048)", [parquet])
            predicate = "WHERE region IN (1, 3) GROUP BY region ORDER BY region"
            sql = "SELECT region, COUNT(*), SUM(amount) FROM read_parquet(?) " + predicate
            start = perf_counter()
            result = db.execute(sql, [parquet]).fetchall()
            compute_ms = (perf_counter() - start) * 1000
            expected = [
                (region, len(values), sum(values))
                for region in (1, 3)
                for values in [[i % 11 for i in range(10000) if i % 4 == region]]
            ]
            assert result == expected
            metadata = db.execute("SELECT COUNT(DISTINCT row_group_id) FROM parquet_metadata(?)", [parquet])
            groups = metadata.fetchone()[0]
            print(f"RESULT {result}. ROW GROUPS {groups}. SINGLE RUN {compute_ms:.3f} ms.")
            print(db.execute("EXPLAIN " + sql, [parquet]).fetchone()[1])


if __name__ == "__main__":
    main()
