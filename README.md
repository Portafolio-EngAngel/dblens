# DBLens — PostgreSQL Database Performance Analyzer

DBLens connects to **your** PostgreSQL database and produces an instant health report covering slow queries, missing indexes, and table bloat. No data is stored; analysis happens in real time and results are returned directly to the browser.

## Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Backend   | Python 3.12, FastAPI, SQLAlchemy, psycopg2 |
| Frontend  | Next.js 14, TypeScript, Tailwind CSS    |
| Container | Docker Compose                          |

## Quick Start

```bash
docker compose up --build
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

> The API is available at [http://localhost:8003](http://localhost:8003).

## How to Use

1. Paste a PostgreSQL connection string into the input field:
   ```
   postgresql://user:password@host:5432/dbname
   ```
2. Click **Analyze Database**.
3. Review the report — no page reload, results appear inline.

## What Is Analyzed

### Slow Queries
Reads from `pg_stat_statements` (requires the extension to be enabled on the target database) and surfaces the top 10 queries ranked by average execution time.

| Column       | Description                         |
|--------------|-------------------------------------|
| Query        | First 200 characters of the SQL     |
| Avg Time     | Mean execution time in milliseconds |
| Calls        | Number of times the query ran       |
| Total Time   | Cumulative execution time           |

### Missing Indexes
Queries `pg_stat_user_tables` for tables with more than 100 sequential scans. Each row includes a ready-to-run `CREATE INDEX` template.

| Column         | Description                                |
|----------------|--------------------------------------------|
| Table          | Fully qualified table name                 |
| Seq Scans      | Number of sequential scans                 |
| Rows Read      | Total rows read via sequential scans       |
| Suggested Index| SQL statement to create a candidate index  |

### Table Health (Bloat)
Inspects `pg_stat_user_tables` for dead-row accumulation. Tables with a dead-row ratio above 10% are flagged as needing a `VACUUM`.

| Column      | Description                                |
|-------------|--------------------------------------------|
| Table       | Fully qualified table name                 |
| Live Rows   | Estimated live row count                   |
| Dead Rows   | Estimated dead (bloated) row count         |
| Dead Ratio  | Dead rows as a percentage of live rows     |
| Status      | **Needs VACUUM** (>10%) or **OK**          |

## Notes

- DBLens does **not** have its own database. It only reads from the target database's system catalog views.
- `pg_stat_statements` must be loaded as a shared library on the target PostgreSQL server for slow-query data to appear. If it is unavailable, that section will be empty rather than failing.
- All queries are read-only; DBLens never modifies your data.
