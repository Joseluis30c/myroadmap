import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week4',
  imports: [RouterLink],
  templateUrl: './week4.html',
})
export class Week4 {
  codeExample1 = `Program.cs — Bootstrap con Serilog antes de todo

// NuGet: Serilog.AspNetCore
//Serilog.Sinks.ApplicationInsights
//Serilog.Enrichers.Environment
//Serilog.Enrichers.Thread

// Configurar Serilog ANTES de builder.Build()
// para capturar errores de startup también
builder.Host.UseSerilog((context, services, configuration) =>
    configuration
        .ReadFrom.Configuration(context.Configuration)  // appsettings.json
        .ReadFrom.Services(services)                    // DI en enrichers
        .Enrich.FromLogContext()                        // LogContext.PushProperty
        .Enrich.WithMachineName()                       // MachineName en cada evento
        .Enrich.WithEnvironmentName()                   // Production/Staging/Development
        .WriteTo.Console(
            outputTemplate: "[{Timestamp:HH:mm:ss.fff} {Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}")
        .WriteTo.ApplicationInsights(
            services.BuildServiceProvider()
                .GetRequiredService<TelemetryConfiguration>(),
            TelemetryConverter.Traces));

// Request logging — una línea por request con duración y status code
app.UseSerilogRequestLogging(opts =>
{
    opts.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000}ms";
    opts.GetLevel = (httpContext, elapsed, ex) => ex is not null || httpContext.Response.StatusCode >= 500
        ? LogEventLevel.Error : LogEventLevel.Information;
    // Enriquecer el log de request con datos del negocio
    opts.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
        diagnosticContext.Set("UserId", httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier));
    };
});`;

  codeExample2 = `appsettings.Production.json — Sin cambiar código al hacer deploy

{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft":                      "Warning",   // silenciar ASP.NET Core interno
        "Microsoft.EntityFrameworkCore":   "Warning",   // silenciar queries SQL de EF
        "Microsoft.EntityFrameworkCore.Database.Command": "Debug",  // solo en staging
        "System.Net.Http":                 "Warning"
      }
    }
  }
}`;

  codeExample3 = `CorrelationIdMiddleware.cs

public class CorrelationIdMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        // Propagar el CorrelationId si viene de otro servicio,
        // o generar uno nuevo para requests externos
        var correlationId =
            context.Request.Headers["X-Correlation-ID"].FirstOrDefault()
            ?? Activity.Current?.TraceId.ToString()
            ?? Guid.NewGuid().ToString("N");

        context.Response.Headers["X-Correlation-ID"] = correlationId;

        // Agregar al LogContext: aparece en TODOS los logs de este request
        using var _ = LogContext.PushProperty("CorrelationId", correlationId);
        using var _userId = LogContext.PushProperty(
            "UserId", context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous");

        await next(context);
    }
}

// Pasar el CorrelationId a microservicios downstream
public class CorrelationIdHandler(IHttpContextAccessor accessor) : DelegatingHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        var correlationId = accessor.HttpContext?
            .Response.Headers["X-Correlation-ID"].ToString();

        if (!string.IsNullOrEmpty(correlationId))
            request.Headers.Add("X-Correlation-ID", correlationId);

        return base.SendAsync(request, ct);
    }
}`;

  codeExample4 = `queries.kql — Application Insights

// ─── 1. ¿Qué excepciones están ocurriendo ahora mismo? ────────────
exceptions
| where timestamp > ago(1h)
| summarize count() by type, outerMessage
| order by count_ desc

// ─── 2. ¿Cuál es la latencia P50/P95/P99 por endpoint? ─────────────
requests
| where timestamp > ago(24h)
| summarize
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99)
  by name, resultCode
| order by p99 desc

// ─── 3. Rastrear un request específico (Correlation ID) ─────────────
union requests, traces, exceptions, dependencies
| where operation_Id == "abc123def456"      // el CorrelationId del usuario
| order by timestamp asc
| project timestamp, itemType, message, severityLevel, duration

// ─── 4. ¿Qué usuarios están teniendo más errores? ──────────────────
exceptions
| where timestamp > ago(24h)
| extend UserId = tostring(customDimensions."UserId")
| where UserId != ""
| summarize count() by UserId
| top 10 by count_

// ─── 5. Dependencias lentas (SQL, Redis, APIs externas) ─────────────
dependencies
| where timestamp > ago(1h) and duration > 500
| project timestamp, name, type, duration, success, target
| order by duration desc

// ─── 6. Tasa de errores por minuto (para alertas) ──────────────────
requests
| where timestamp > ago(1h)
| summarize
    total   = count(),
    errors  = countif(resultCode >= "500")
  by bin(timestamp, 1m)
| extend errorRate = round(100.0 * errors / total, 2)
| render timechart`;

  codeExample5 = `Program.cs — Health Checks completos

// NuGet: AspNetCore.HealthChecks.SqlServer
//        AspNetCore.HealthChecks.Redis
//        AspNetCore.HealthChecks.Uris (para dependencias HTTP)

builder.Services
    .AddHealthChecks()
    // Liveness: ¿está el proceso vivo?
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    // Readiness: ¿puede recibir tráfico?
    .AddSqlServer(
        connectionString: builder.Configuration["ConnectionStrings:Default"]!,
        name: "sql-server",
        tags: ["ready", "db"])
    .AddRedis(
        redisConnectionString: builder.Configuration["Redis:ConnectionString"]!,
        name: "redis",
        tags: ["ready", "cache"])
    .AddUrlGroup(
        uri: new Uri(builder.Configuration["Services:CatalogUrl"]! + "/health/live"),
        name: "catalog-api",
        tags: ["ready"]);

// Endpoint JSON detallado para debugging
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});
// Endpoints separados para liveness y readiness
app.MapHealthChecks("/health/live",  new HealthCheckOptions { Predicate = hc => hc.Tags.Contains("live") });
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = hc => hc.Tags.Contains("ready") });`;

  codeExample6 = `GlobalExceptionHandler.cs

// .NET 8: IExceptionHandler — la forma moderna
public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        // Loggear con todo el contexto — el Serilog lo enriquece con CorrelationId y UserId
        logger.LogError(
            exception,
            "Unhandled exception | Path={Path} | Method={Method}",
            httpContext.Request.Path,
            httpContext.Request.Method);

        // Mapear excepciones de dominio a códigos HTTP correctos
        (int statusCode, string title) = exception switch
        {
            NotFoundException _      => (404, "Resource Not Found"),
            ValidationException _    => (422, "Validation Failed"),
            UnauthorizedException _  => (401, "Unauthorized"),
            ForbiddenException _     => (403, "Forbidden"),
            ConflictException _      => (409, "Conflict"),
            _                        => (500, "An unexpected error occurred")
        };

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Type     = $"https://api.miapp.com/errors/{statusCode}",
            Title    = title,
            Status   = statusCode,
            Instance = httpContext.Request.Path,
            Extensions =
            {
                ["requestId"]     = httpContext.TraceIdentifier,
                // NUNCA incluir exception.Message ni StackTrace aquí
                // Solo el requestId para que soporte correlacione con los logs
            }
        }, ct);

        return true;  // true = excepción manejada, no propagar
    }
}`;

}
