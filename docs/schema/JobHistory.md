# [MyApp].[JobHistory]

Completed or cancelled jobs moved from `JobQueue` for historical tracking.

## Purpose

This table stores finished jobs (both successful and cancelled) to maintain a complete audit trail while keeping the active `JobQueue` table small for optimal query performance.

## Columns

Same schema as `JobQueue`:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| QueueID | VARCHAR(255) | - | Queue/command name identifier |
| TrackingID | UNIQUEIDENTIFIER | - | Primary key, unique job identifier |
| WorkCommandJson | VARCHAR(MAX) | `{}` | Serialized job command/parameters |
| WorkResultJson | VARCHAR(MAX) | `{}` | Serialized job result |
| WorkLogJsonLines | VARCHAR(MAX) | `''` | Newline-separated JSON log entries |
| Tries | INT | `0` | Total execution attempts |
| ExecuteAfter | DATETIME | - | Original scheduled start time |
| ExpireOn | DATETIME | - | Original expiration time |
| IsComplete | BIT | - | `1` if completed successfully |
| IsCancelled | BIT | - | `1` if cancelled or expired |
| StartedOn | DATETIME | - | When job execution started |
| FinishedOn | DATETIME | - | When job execution finished |
| CreatedOn | DATETIME | - | Original record creation timestamp |
| CreatedByUserId | VARCHAR(100) | - | User ID who created the job |
| CreatedByDisplayName | VARCHAR(255) | - | Display name of creator |

## Indexes

- Primary key on `TrackingID`

## Usage

Jobs are moved here from `JobQueue` when:
- Job completes successfully (`IsComplete = 1`)
- Job is cancelled (`IsCancelled = 1`)
- Job expires without completion (`IsCancelled = 1`, with log entry)

## Querying

To get full job history including active jobs:

```sql
SELECT * FROM [MyApp].[JobQueue] WHERE TrackingID = @id
UNION ALL
SELECT * FROM [MyApp].[JobHistory] WHERE TrackingID = @id
```
