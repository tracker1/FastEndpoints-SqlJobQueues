# Database Migrations

Database schema management using [grate](https://github.com/erikbra/grate).

## Directory Structure

| Directory | Purpose | Execution |
|-----------|---------|-----------|
| `runBeforeUp/` | Pre-migration setup (schemas, permissions) | Every run |
| `up/` | Schema migrations | Once per file |

## Running Migrations

```bash
# From workspace root
./_scripts/dbup

# Or via Docker directly
docker compose up --build db
```

## Configuration

- **Collation:** `Latin1_General_100_CI_AI_SC_UTF8`
- **Schema:** `[MyApp]`

## Schema Documentation

See [docs/schema/](../docs/schema/) for table specifications:
- [JobQueue.md](../docs/schema/JobQueue.md) - Active jobs
- [JobHistory.md](../docs/schema/JobHistory.md) - Completed jobs

## Adding Migrations

Create numbered SQL files in `up/`:
```
up/0001_JobQueues.sql
up/0002_NewFeature.sql
```

grate tracks applied migrations and only runs new ones.
