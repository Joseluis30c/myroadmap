import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week2',
  imports: [RouterLink],
  templateUrl: './week2.html',
})
export class Week2 {
  codeExample1 = `Program.cs

— Configuración de versionado
// NuGet: Asp.Versioning.Mvc
//        Asp.Versioning.Mvc.ApiExplorer  (para Swagger)

builder.Services.AddApiVersioning(options =>
{
    // Si el cliente no especifica versión → usar la default
    options.DefaultApiVersion                   = new ApiVersion(2, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;

    // Reportar versiones disponibles en headers de respuesta
    // X-Api-Supported-Versions: 1.0, 2.0, 3.0
    // X-Api-Deprecated-Versions: 1.0
    options.ReportApiVersions = true;

    // Aceptar múltiples estrategias simultáneamente
    options.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),               // /api/v2/orders
        new QueryStringApiVersionReader("api-version"), // ?api-version=2.0
        new HeaderApiVersionReader("api-version")       // header: api-version: 2.0
    );
})
.AddApiExplorer(options =>
{
    options.GroupNameFormat           = "'v'VVV";   // "v1", "v2", "v3"
    options.SubstituteApiVersionInUrl = true;      // /api/{version}/ → /api/v2/
});`;

  codeExample2 = `OrdersController.cs

— Múltiples versiones en un controller
[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("2.0")]               // versión activa
[ApiVersion("1.0", Deprecated = true)] // deprecated → agrega Sunset header
public class OrdersController : ControllerBase
{
    // Este action responde para v2 (sin MapToApiVersion → mapea a todas)
    [HttpGet("{id}")]
    [MapToApiVersion("2.0")]
    public async Task<IActionResult> GetOrderV2(Guid id)
    {
        // v2: retorna el modelo completo con items incluidos
        var order = await _service.GetWithItemsAsync(id);
        return order is null ? NotFound() : Ok(order);
    }

    // Este action responde para v1 (el modelo antiguo más simple)
    [HttpGet("{id}")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> GetOrderV1(Guid id)
    {
        // v1: retorna solo datos básicos del pedido (sin items)
        var order = await _service.GetBasicAsync(id);
        return order is null ? NotFound() : Ok(order);
    }
}
// Response headers automáticos para el cliente:
// X-Api-Supported-Versions: 1.0, 2.0
// X-Api-Deprecated-Versions: 1.0
// Sunset: Sat, 31 Dec 2025 23:59:59 GMT  ← cuando especificas SunsetPolicy`;

  codeExample3 = `Program.cs

— Swagger con versiones y JWT
// NuGet: Swashbuckle.AspNetCore
//        Swashbuckle.AspNetCore.Filters  (para ejemplos)
//        Scalar.AspNetCore               (UI moderna)

builder.Services.AddSwaggerGen(options =>
{
    // Un documento Swagger por versión de API
    var provider = builder.Services.BuildServiceProvider()
        .GetRequiredService<IApiVersionDescriptionProvider>();

    foreach (var description in provider.ApiVersionDescriptions)
    {
        options.SwaggerDoc(description.GroupName, new OpenApiInfo
        {
            Title       = $"MiApp API {description.GroupName}",
            Version     = description.GroupName,
            Description = description.IsDeprecated
                ? "⚠️ Esta versión está deprecated. Migra a v3."
                : "API REST de MiApp — documentación completa.",
            Contact = new OpenApiContact { Name = "Dev Team", Email = "api@miapp.com" }
        });
    }

    // JWT Bearer en la UI — botón Authorize funcional
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = SecuritySchemeType.Http,
        Scheme       = "bearer",
        BearerFormat = "JWT",
        In           = ParameterLocation.Header,
        Description  = "Ingresa el token JWT. Ejemplo: eyJhbGc..."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {{
        new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
        },
        Array.Empty<string>()
    }});

    // Incluir XML comments (habilitar en .csproj: <GenerateDocumentationFile>true</GenerateDocumentationFile>)
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFile));

    // Ejemplos automáticos de request/response
    options.ExampleFilters();
});`;

  codeExample4 = `OrdersController.cs

— XML comments + ejemplos de respuesta
/// <summary>
/// Obtiene un pedido por su ID incluyendo los artículos y el estado de envío.
/// </summary>
/// <param name="id">ID único del pedido (GUID)</param>
/// <returns>El pedido con sus artículos y estado</returns>
/// <response code="200">Pedido encontrado</response>
/// <response code="404">El pedido no existe o no pertenece al usuario actual</response>
/// <response code="401">No autenticado</response>
[HttpGet("{id:guid}")]
[ProducesResponseType(typeof(OrderResponse), StatusCodes.Status200OK)]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[SwaggerResponseExample(StatusCodes.Status200OK, typeof(OrderResponseExample))]
public async Task<IActionResult> GetOrder(Guid id) { /* ... */ }

// Clase de ejemplo — Swashbuckle.AspNetCore.Filters la usa en la UI
public class OrderResponseExample : IExamplesProvider<OrderResponse>
{
    public OrderResponse GetExamples() => new()
    {
        Id         = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6"),
        CustomerId = "cust_42",
        Total      = 99.99m,
        Status     = "Pending",
        Items      = [new() { ProductId = "prod_01", Qty = 2, Price = 49.99m }]
    };
}`;

  codeExample5 = `Program.cs

— Problem Details global
// Problem Details: respuestas de error consistentes en toda la API
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions["requestId"] =
            context.HttpContext.TraceIdentifier;
        context.ProblemDetails.Extensions["timestamp"] =
            DateTimeOffset.UtcNow;
        // NUNCA exponer el stack trace en producción
        if (!context.HttpContext.RequestServices
            .GetRequiredService<IHostEnvironment>()
            .IsDevelopment())
        {
            context.ProblemDetails.Extensions.Remove("exception");
        }
    };
});

app.UseExceptionHandler();   // captura toda excepción no manejada
app.UseStatusCodePages();   // convierte 404, 401, 403 a ProblemDetails`;

  codeExample6 = `Errores tipados

— Respuesta de error de nivel Stripe
// Error response formato consistente
// HTTP 422 con Problem Details extendido:
{
  "type":    "https://api.miapp.com/errors/validation-failed",
  "title":   "One or more validation errors occurred.",
  "status":  422,
  "detail":  "The request body failed validation.",
  "instance":"/api/v3/orders",
  "requestId": "00-abc123-def456-00",  // para soporte: buscar en logs
  "errors": {
    "quantity": ["must be greater than 0"],
    "productId": ["is required"]
  }
}

// NSwag: generar cliente TypeScript desde el OpenAPI spec
// Instalar: dotnet tool install -g NSwag.ConsoleX
// nswag openapi2tsclient /input:https://localhost:5001/swagger/v3/swagger.json 
//        /output:./client/api-client.ts
//        /template:Axios`;

  codeExample7 = `appsettings.json

— YARP con versionado
{
  "ReverseProxy": {
    "Routes": {
      "orders-v3": {
        "ClusterId": "orders-cluster",
        "Match": { "Path": "/api/v{version:apiVersion}/orders/{**rest}" },
        "Transforms": [{ "PathPattern": "/api/v{version}/orders/{**rest}" }]
      },
      "swagger-orders": {
        "ClusterId": "orders-cluster",
        "Match": { "Path": "/swagger/orders/{**catch-all}" },
        "Transforms": [{ "PathRemovePrefix": "/swagger/orders" }]
      }
    }
  }
}`;

  codeExample8 = `Program.cs

— Swagger Gateway con todos los servicios
// Gateway: un Swagger con los docs de todos los microservicios
builder.Services.AddSwaggerGen(c =>
{
    // Un documento por servicio y versión
    c.SwaggerDoc("orders-v3",   new OpenApiInfo { Title = "Orders API",   Version = "v3" });
    c.SwaggerDoc("catalog-v3",  new OpenApiInfo { Title = "Catalog API",  Version = "v3" });
    c.SwaggerDoc("users-v2",    new OpenApiInfo { Title = "Users API",    Version = "v2" });
});

// En el gateway, los endpoints de /swagger/{service}/swagger.json
// hacen proxy a cada microservicio
app.UseSwaggerUI(c =>
{
    // Cada servicio aparece como una opción en el dropdown de la UI
    c.SwaggerEndpoint("/swagger/orders/swagger/v3/swagger.json",  "Orders v3");
    c.SwaggerEndpoint("/swagger/catalog/swagger/v3/swagger.json", "Catalog v3");
    c.SwaggerEndpoint("/swagger/users/swagger/v2/swagger.json",   "Users v2");
    c.RoutePrefix = string.Empty;   // Swagger en la raíz: http://gateway/
});

// Alternativa más moderna: usar Scalar
app.MapScalarApiReference(options =>
{
    options.WithTitle("MiApp API")
           .WithTheme(ScalarTheme.DeepSpace)
           .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
});`;

}
