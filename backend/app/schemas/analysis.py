from urllib.parse import urlparse

from pydantic import BaseModel, field_validator

_ALLOWED_SCHEMES = {"postgresql", "postgres"}


class AnalyzeRequest(BaseModel):
    connection_string: str  # postgresql://user:pass@host:5432/dbname

    @field_validator("connection_string")
    @classmethod
    def validate_connection_string(cls, v: str) -> str:
        parsed = urlparse(v)
        if parsed.scheme not in _ALLOWED_SCHEMES:
            raise ValueError("Only postgresql:// connection strings are accepted")
        if not parsed.hostname:
            raise ValueError("Connection string must include a hostname")
        if not parsed.path or parsed.path in ("/", ""):
            raise ValueError("Connection string must specify a database name")
        return v


class SlowQuery(BaseModel):
    query: str
    calls: int
    avg_time_ms: float
    total_time_ms: float
    rows: int


class MissingIndex(BaseModel):
    table: str
    seq_scans: int
    rows_read: int
    suggestion: str


class TableHealth(BaseModel):
    table: str
    live_rows: int
    dead_rows: int
    dead_ratio: float  # dead/live ratio as a percentage
    needs_vacuum: bool


class AnalysisResult(BaseModel):
    connection_ok: bool
    database: str
    slow_queries: list[SlowQuery]
    missing_indexes: list[MissingIndex]
    table_health: list[TableHealth]
    summary: dict  # {"total_slow_queries": N, "tables_needing_vacuum": N, "indexes_to_create": N}
