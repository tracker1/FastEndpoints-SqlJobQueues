IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'MyApp')
BEGIN
    EXEC('CREATE SCHEMA [MyApp]');
END
