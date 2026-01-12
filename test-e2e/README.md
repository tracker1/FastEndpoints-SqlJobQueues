# End-to-End Tests

Node.js 24+ TypeScript tests for the FastEndpoints SQL Job Queues API.

Uses `tsx` for direct TypeScript execution without a build step.

## Running Tests

```bash
# From workspace root (starts app server if needed)
_scripts/test-e2e

# Or directly with npm
cd test-e2e
npm install
npm test

# Watch mode for development
npm run test:watch

# With custom API URL and database settings
API_BASE_URL=http://localhost:5000 \
DB_HOST=localhost \
DB_PORT=1433 \
DB_NAME=MyAppDatabase \
DB_USER=MyAppUser \
DB_PASSWORD=MyAppSecretPassword!123 \
npm test
```

## Test Structure

Tests mirror the `app/Features` directory structure under `jobs/`.

```
test-e2e/
├── lib/
│   ├── api.ts       # API fetch utilities
│   └── db.ts        # SQL Server connection utilities
├── jobs/
│   ├── simple/      # Simple command tests
│   └── complex/     # Complex job tests with DB verification
├── package.json
└── tsconfig.json
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `http://localhost:5000` | Base URL for API requests |
| `DB_HOST` | `localhost` | SQL Server host |
| `DB_PORT` | `1433` | SQL Server port |
| `DB_NAME` | `MyAppDatabase` | Database name |
| `DB_USER` | `MyAppUser` | Database user |
| `DB_PASSWORD` | `MyAppSecretPassword!123` | Database password |

## Features

- **API Testing**: Tests REST API endpoints using native fetch
- **Database Verification**: Uses `mssql` package to verify database state
- **TypeScript**: Full type safety with `tsx` for direct execution (no build step)
- **Node.js Test Runner**: Uses built-in `node:test` module
