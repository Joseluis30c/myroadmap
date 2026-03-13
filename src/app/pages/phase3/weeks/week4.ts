import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week4',
  imports: [RouterLink],
  templateUrl: './week4.html',
})
export class Week4 {
  codeExample1 = `Program.cs — Integración con IConfiguration

// NuGet: Azure.Extensions.AspNetCore.Configuration.Secrets
// Azure.Identity

using Azure.Identity;

var builder = WebApplication.CreateBuilder(args);

// Agregar Key Vault como fuente de configuración
// DefaultAzureCredential usa Managed Identity en Azure
// y az login / env vars en local — el mismo código sirve para ambos
var keyVaultUri = new Uri(builder.Configuration["KeyVaultUri"]!);

builder.Configuration.AddAzureKeyVault(
    keyVaultUri,
    new DefaultAzureCredential());

// Ahora los secrets de Key Vault se leen igual que appsettings.json
// Key Vault: "DefaultConnection"    → Configuration["DefaultConnection"]
// Key Vault: "JwtSecret"            → Configuration["JwtSecret"]
// Separador de jerarquía en KV: "--" (doble guion)
// Key Vault: "Jwt--Secret"          → Configuration["Jwt:Secret"]

var connStr   = builder.Configuration["DefaultConnection"];
var jwtSecret = builder.Configuration["JwtSecret"];

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(connStr));

// KeyVaultUri viene de App Settings del Container App (no sensible)
// Los valores sensibles SOLO en Key Vault`;

  codeExample2 = `Program.cs — Serilog + Application Insights

// NuGet: Serilog.AspNetCore
// Serilog.Sinks.ApplicationInsights
// Microsoft.ApplicationInsights.AspNetCore

using Serilog;
using Serilog.Events;

// Configurar Serilog antes de cualquier otra cosa
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .MinimumLevel.Override("System", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "MiApi")
    .Enrich.WithProperty("Environment",
        Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"))
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .WriteTo.ApplicationInsights(
        TelemetryConfiguration.Active,
        TelemetryConverter.Traces)
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();

    // App Insights con ILogger — captura requests, deps, exceptions automáticamente
    builder.Services.AddApplicationInsightsTelemetry(
        builder.Configuration["ApplicationInsights:ConnectionString"]);

    // ... resto de la configuración

    var app = builder.Build();
    app.UseSerilogRequestLogging(opts => {
        opts.MessageTemplate =
            "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        opts.EnrichDiagnosticContext = (diagCtx, httpCtx) => {
            // Agregar campos para filtrar en KQL
            diagCtx.Set("RequestHost",   httpCtx.Request.Host.Value);
            diagCtx.Set("UserAgent",     httpCtx.Request.Headers.UserAgent.FirstOrDefault());
            diagCtx.Set("UserId",        httpCtx.User.FindFirst("sub")?.Value ?? "anonymous");
        };
    });
    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    await Log.CloseAndFlushAsync(); // asegurar que se envíen todos los logs antes de salir
}`;

}
