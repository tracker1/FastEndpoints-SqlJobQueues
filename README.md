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
├── run/       # Shell automation scripts
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
   run/dbup
   ```

3. **Run the application:**
   ```bash
   cd app
   dotnet run
   ```

   or, in docker

   ```bash
   run/appup
   ```

4. **Access Swagger UI:**
   Open http://localhost:5000/swagger in your browser.

## Scripts

| Script              | Description |
|---------------------|-------------|
| `run/clean`    | Stop Docker services and remove volumes |
| `run/down`     | Stop Docker services  |
| `run/dbup`     | Start SQL Server, create database/user, run migrations |
| `run/appup`    | Start App Server (runs dbup)
| `run/appdown`  | Stop App Server
| `run/test-e2e` | Runs end to end tests (runs appup)

## Database

See [db/README.md](db/README.md) for database schema and migration details.

## License

MIT License - Copyright 2026 Michael J. Ryan
