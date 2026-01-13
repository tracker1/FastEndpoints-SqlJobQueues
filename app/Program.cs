using Application.Extensions;
using Application.Extensions.Data;
using Application.Jobs;
using Dapper;
using DotNetEnv;
using DotNetEnv.Configuration;
using FastEndpoints;
using FastEndpoints.Swagger;
using Microsoft.Data.SqlClient;

var builder = WebApplication.CreateBuilder(args);

// load environment variables from .env file if present in upstream path
// WARNING: will give weird errors if the file is malformed
builder.Configuration.AddDotNetEnv(".env", LoadOptions.TraversePath());

// Add Dapper type handlers
SqlMapper.AddTypeHandler(new JsonNodeTypeHandler());
SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());
SqlMapper.AddTypeHandler(new TimeOnlyTypeHandler());

// Use shared JSON serialization settings
builder.Services.ConfigureHttpJsonOptions(options =>
  JsonHelper.ConfigureDefaults(options.SerializerOptions));

// Add Dependencies - connection string for creating new connections
var connectionString = builder.Configuration.GetConnectionString("MyAppDatabase");
builder.Services.AddSingleton<Func<SqlConnection>>(() =>
  new SqlConnection(connectionString));

builder.Services
  .AddFastEndpoints()
  .AddJobQueues<JobRecord, JobStorageProvider>()
  .AddScoped<IJobStorageProvider<JobRecord>, JobStorageProvider>()
  .AddScoped<IJobResultProvider, JobStorageProvider>()
  .AddScoped<JobStorageProvider>()
  .AddScoped(typeof(IJobTracker<>), typeof(PersistentJobTracker<>));

builder.Services.SwaggerDocument(o =>
{
  o.DocumentSettings = s =>
  {
    s.Title = "FastEndpoints SQL Job Queues API";
    s.Version = "v1";
    s.Description = "Job queue implementation with FastEndpoints and MS SQL Server";
  };
});

var app = builder.Build();

app.UseFastEndpoints()
  .UseJobQueues(o =>
  {
    o.MaxConcurrency = 1;
    o.ExecutionTimeLimit = TimeSpan.FromMinutes(60);
  });
app.UseSwaggerGen();

app.Run();
