# FastEndpoints-SqlJobQueues

A job queue implementation using FastEndpoints and MS SQL Server for reliable background task processing.

## Overview

This project demonstrates a production-ready job queue system built with:

- **.NET 10** - Runtime platform
- **FastEndpoints** - High-performance API framework
- **Dapper** - Lightweight data access
- **MS SQL Server** - Persistent job storage
- **grate** - Database migrations

## Project Structure

```
workspace/
├── _scripts/       # Shell automation scripts
├── app/            # FastEndpoints web application
├── db/             # Database migrations (grate)
├── test-e2e/       # Node.js-based API and database tests
└── docker-compose.yml
```

## Prerequisites

- Linux or WSL (Windows Subsystem for Linux)
- Docker and Docker Compose
- .NET 10 SDK
- Node.js 24+ (for e2e tests)

## Getting Started

1. **Copy environment file:**
   ```bash
   cp .env.sample .env
   ```

2. **Start SQL Server and run migrations:**
   ```bash
   ./_scripts/dbup
   ```

3. **Run the application:**
   ```bash
   cd app
   dotnet run
   ```

   or, in docker

   ```bash
   ./_scripts/appup
   ```

4. **Access Swagger UI:**
   Open http://localhost:5000/swagger in your browser.

## Scripts

| Script              | Description |
|---------------------|-------------|
| `_scripts/clean`    | Stop Docker services and remove volumes |
| `_scripts/down`     | Stop Docker services  |
| `_scripts/dbup`     | Start SQL Server, create database/user, run migrations |
| `_scripts/appup`    | Start App Server (runs dbup)
| `_scripts/appdown`  | Stop App Server
| `_scripts/test-e2e` | Runs end to end tests (runs appup)

## Database

See [db/README.md](db/README.md) for database schema and migration details.

## License

MIT License - Copyright 2026 Michael J. Ryan
