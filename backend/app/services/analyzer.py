from sqlalchemy import create_engine, text

from app.schemas.analysis import (
    AnalysisResult,
    MissingIndex,
    SlowQuery,
    TableHealth,
)

_SLOW_QUERIES_SQL = text("""
    SELECT
        LEFT(query, 200) AS query,
        calls,
        ROUND((mean_exec_time)::numeric, 2) AS avg_time_ms,
        ROUND((total_exec_time)::numeric, 2) AS total_time_ms,
        rows
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat%'
    ORDER BY mean_exec_time DESC
    LIMIT 10
""")

_MISSING_INDEXES_SQL = text("""
    SELECT
        schemaname || '.' || relname AS table,
        seq_scan AS seq_scans,
        seq_tup_read AS rows_read,
        'CREATE INDEX ON ' || schemaname || '.' || relname || ' (<frequently_filtered_column>);' AS suggestion
    FROM pg_stat_user_tables
    WHERE seq_scan > 100
    ORDER BY seq_tup_read DESC
    LIMIT 10
""")

_TABLE_HEALTH_SQL = text("""
    SELECT
        schemaname || '.' || relname AS table,
        n_live_tup AS live_rows,
        n_dead_tup AS dead_rows,
        CASE WHEN n_live_tup > 0
             THEN ROUND((n_dead_tup::float / n_live_tup * 100)::numeric, 1)
             ELSE 0
        END AS dead_ratio
    FROM pg_stat_user_tables
    WHERE n_live_tup > 0
    ORDER BY n_dead_tup DESC
    LIMIT 10
""")

_CURRENT_DB_SQL = text("SELECT current_database()")


def _fetch_slow_queries(conn) -> list[SlowQuery]:
    try:
        rows = conn.execute(_SLOW_QUERIES_SQL).fetchall()
        return [
            SlowQuery(
                query=row.query,
                calls=row.calls,
                avg_time_ms=float(row.avg_time_ms),
                total_time_ms=float(row.total_time_ms),
                rows=row.rows,
            )
            for row in rows
        ]
    except Exception:
        # pg_stat_statements extension not available or insufficient privileges
        return []


def _fetch_missing_indexes(conn) -> list[MissingIndex]:
    try:
        rows = conn.execute(_MISSING_INDEXES_SQL).fetchall()
        return [
            MissingIndex(
                table=row.table,
                seq_scans=row.seq_scans,
                rows_read=row.rows_read,
                suggestion=row.suggestion,
            )
            for row in rows
        ]
    except Exception:
        return []


def _fetch_table_health(conn) -> list[TableHealth]:
    try:
        rows = conn.execute(_TABLE_HEALTH_SQL).fetchall()
        return [
            TableHealth(
                table=row.table,
                live_rows=row.live_rows,
                dead_rows=row.dead_rows,
                dead_ratio=float(row.dead_ratio),
                needs_vacuum=float(row.dead_ratio) > 10.0,
            )
            for row in rows
        ]
    except Exception:
        return []


def _fetch_database_name(conn) -> str:
    try:
        row = conn.execute(_CURRENT_DB_SQL).fetchone()
        return row[0] if row else "unknown"
    except Exception:
        return "unknown"


def analyze(connection_string: str) -> AnalysisResult:
    engine = None
    try:
        engine = create_engine(connection_string, pool_pre_ping=True)
        with engine.connect() as conn:
            database_name = _fetch_database_name(conn)
            slow_queries = _fetch_slow_queries(conn)
            missing_indexes = _fetch_missing_indexes(conn)
            table_health = _fetch_table_health(conn)

        tables_needing_vacuum = sum(1 for t in table_health if t.needs_vacuum)

        return AnalysisResult(
            connection_ok=True,
            database=database_name,
            slow_queries=slow_queries,
            missing_indexes=missing_indexes,
            table_health=table_health,
            summary={
                "total_slow_queries": len(slow_queries),
                "tables_needing_vacuum": tables_needing_vacuum,
                "indexes_to_create": len(missing_indexes),
            },
        )
    except Exception:
        return AnalysisResult(
            connection_ok=False,
            database="",
            slow_queries=[],
            missing_indexes=[],
            table_health=[],
            summary={
                "total_slow_queries": 0,
                "tables_needing_vacuum": 0,
                "indexes_to_create": 0,
            },
        )
    finally:
        if engine is not None:
            engine.dispose()
