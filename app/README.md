# FastEndpoints SQL Job Queues - Application

The main web API application built with FastEndpoints, Dapper, and MS SQL Server.

## Technology Stack

- **.NET 10** - Runtime
- **FastEndpoints** - API framework
- **FastEndpoints.Swagger** - OpenAPI/Swagger documentation
- **Dapper** - Data access (micro-ORM)
- **Microsoft.Data.SqlClient** - SQL Server connectivity
- **DotNetEnv** - Environment variable loading

## Project Structure

```
app/
├── Features/           # Feature-based endpoint organization
│   └── Application/    # Application-level utilities
│       └── Extensions/ # Extension classes
│           └── Data/   # Dapper type handlers
├── Program.cs          # Application entry point
├── appsettings.json    # Configuration
└── app.csproj          # Project file
```

## Running the Application

```bash
# From the app directory
dotnet run

# Or with hot reload
dotnet watch run
```

## Configuration

### Connection String

The application uses the `MyAppDatabase` connection string from `appsettings.json` or environment variables.

```json
{
  "ConnectionStrings": {
    "MyAppDatabase": "Server=localhost;Database=MyAppDatabase;User Id=MyAppUser;Password=...;TrustServerCertificate=True"
  }
}
```

### Environment Variables

Environment variables are loaded from the `.env` file in the workspace root directory using DotNetEnv with path traversal.

## API Documentation

When running, Swagger UI is available at:
- http://localhost:5000/swagger

## Dependency Injection

The application registers:
- `SqlConnection` - Scoped, configured with `MyAppDatabase` connection string

## Dapper Type Handlers

Custom type handlers are registered for:
- `JsonNode` - System.Text.Json node handling
- `DateOnly` - Date-only type support
- `TimeOnly` - Time-only type support
