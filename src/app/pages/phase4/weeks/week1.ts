import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week1',
  imports: [RouterLink],
  templateUrl: './week1.html',
})
export class Week1 {
  codeExample1 = `Program.cs

— Registrar Typed Client con resiliencia
// NuGet: Microsoft.Extensions.Http.Resilience (incluye Polly v8)

// ─── Typed Client: CatalogServiceClient ───────────────────────────
builder.Services
    .AddHttpClient<ICatalogServiceClient, CatalogServiceClient>(client =>
    {
        client.BaseAddress = new Uri(
            builder.Configuration["Services:Catalog:BaseUrl"]!);
        client.Timeout = TimeSpan.FromSeconds(30);
        client.DefaultRequestHeaders.Add("Accept", "application/json");
    })
    // Polly v8: pipeline de resiliencia estándar
    .AddStandardResilienceHandler(options =>
    {
        // Retry: 3 intentos con backoff exponencial + jitter aleatorio
        options.Retry.MaxRetryAttempts   = 3;
        options.Retry.BackoffType        = DelayBackoffType.Exponential;
        options.Retry.UseJitter           = true;
        options.Retry.Delay              = TimeSpan.FromSeconds(1);

        // Circuit Breaker: abre si 50% de requests fallan en 10s
        options.CircuitBreaker.FailureRatio         = 0.5;
        options.CircuitBreaker.SamplingDuration     = TimeSpan.FromSeconds(10);
        options.CircuitBreaker.MinimumThroughput    = 5;
        options.CircuitBreaker.BreakDuration        = TimeSpan.FromSeconds(30);

        // Timeout: máximo 5s por request individual
        options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(5);
    });`;

  codeExample2 = `CatalogServiceClient.cs

— Typed client
public class CatalogServiceClient(HttpClient httpClient) : ICatalogServiceClient
{
    public async Task<ProductDto?> GetProductAsync(Guid productId, CancellationToken ct)
    {
        try
        {
            // El HttpClient ya tiene BaseAddress configurado
            var response = await httpClient
                .GetAsync($"api/products/{productId}", ct);

            if (response.StatusCode == HttpStatusCode.NotFound) return null;
            response.EnsureSuccessStatusCode();

            return await response.Content
                .ReadFromJsonAsync<ProductDto>(cancellationToken: ct);
        }
        catch (BrokenCircuitException)
        {
            // Circuit breaker abierto: catalog service no disponible
            // Retornar un valor degradado en lugar de fallar toda la request
            _logger.LogWarning("Catalog service circuit open — returning degraded response");
            return null;   // graceful degradation
        }
    }
}`;

  codeExample3 = `solution-structure.sh

— Crear la solución
# Estructura de la solución de microservicios
MiApp/
├── src/
│   ├── Services/
│   │   ├── Orders/
│   │   │   ├── Orders.API/          # ASP.NET Core 8, puerto 8001
│   │   │   └── Orders.Domain/
│   │   ├── Catalog/
│   │   │   ├── Catalog.API/         # ASP.NET Core 8, puerto 8002
│   │   │   └── Catalog.Domain/
│   │   └── Users/
│   │       └── Users.API/           # ASP.NET Core 8, puerto 8003
│   └── Gateway/
│       └── Gateway.API/             # YARP, puerto 8000 (entry point)
├── docker-compose.yml
└── MiApp.sln

# Crear servicios
dotnet new webapi -n Orders.API    --output src/Services/Orders/Orders.API
dotnet new webapi -n Catalog.API   --output src/Services/Catalog/Catalog.API
dotnet new webapi -n Gateway.API   --output src/Gateway/Gateway.API
dotnet add src/Gateway/Gateway.API package Yarp.ReverseProxy`;

  codeExample4 = `appsettings.json

— Configuración YARP Gateway
{
  "ReverseProxy": {
    "Routes": {
      "orders-route": {
        "ClusterId": "orders-cluster",
        "Match": { "Path": "/api/orders/{**catch-all}" }
      },
      "catalog-route": {
        "ClusterId": "catalog-cluster",
        "Match": { "Path": "/api/products/{**catch-all}" }
      }
    },
    "Clusters": {
      "orders-cluster": {
        "Destinations": {
          "orders-api": { "Address": "http://orders-api:8001" }
        }
      },
      "catalog-cluster": {
        "Destinations": {
          "catalog-api": { "Address": "http://catalog-api:8002" }
        }
      }
    }
  }
}`;

  codeExample5 = `docker-compose.yml

— Todos los servicios
name: miapp-microservices

services:
  gateway:
    build: src/Gateway/Gateway.API
    ports: ["8000:8080"]         # único punto de entrada
    environment:
      ReverseProxy__Clusters__orders-cluster__Destinations__orders-api__Address:
        "http://orders-api:8080"

  orders-api:
    build: src/Services/Orders/Orders.API
    environment:
      ConnectionStrings__DefaultConnection: "Server=orders-db;..."
      Services__Catalog__BaseUrl: "http://catalog-api:8080"
    depends_on:
      orders-db: { condition: service_healthy }

  catalog-api:
    build: src/Services/Catalog/Catalog.API
    environment:
      ConnectionStrings__DefaultConnection: "Server=catalog-db;..."
    depends_on:
      catalog-db: { condition: service_healthy }

  orders-db:                         # BD propia de Orders
    image: mcr.microsoft.com/mssql/server:2022-latest

  catalog-db:                        # BD propia de Catalog — completamente separada
    image: mcr.microsoft.com/mssql/server:2022-latest`;

}
