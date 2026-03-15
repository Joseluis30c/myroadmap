import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week3',
  imports: [RouterLink],
  templateUrl: './week3.html',
})
export class Week3 {
  codeExample1 = `Program.csv — Validar JWT con scopes en ASP.NET Core

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // OIDC Discovery automático — descarga las claves públicas del auth server
        options.Authority = builder.Configuration["Auth:Authority"];
        options.Audience  = "orders-api";
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();

        options.TokenValidationParameters = new
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ClockSkew                = TimeSpan.Zero   // sin tolerancia de reloj
        };
    });

// Authorization policies basadas en scopes/roles
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("orders:read", policy =>
        policy.RequireClaim("scope", "orders:read"));

    options.AddPolicy("orders:write", policy =>
        policy.RequireClaim("scope", "orders:write"));
});

// Usar en endpoints
[Authorize(Policy = "orders:read")]
[HttpGet("{id}")]
public async Task<IActionResult> GetOrder(Guid id) { /* ... */ }

[Authorize(Policy = "orders:write")]
[HttpPost]
public async Task<IActionResult> CreateOrder(CreateOrderRequest req) { /* ... */ }`;

  codeExample2 = `TokenRevocationService.cs

public class TokenRevocationService(IDistributedCache cache)
{
    // Revocar un token (logout, cambio de contraseña, compromiso)
    public async Task RevokeAsync(string jti, DateTimeOffset expiry)
    {
        // Guardar el jti (JWT ID) en Redis hasta que el token expire naturalmente
        var ttl = expiry - DateTimeOffset.UtcNow;
        await cache.SetStringAsync($"revoked:{jti}", "1",
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
    }

    public async Task<bool> IsRevokedAsync(string jti)
        => await cache.GetStringAsync($"revoked:{jti}") is not null;
}

// Middleware para validar revocación en cada request
options.Events = new JwtBearerEvents
{
    OnTokenValidated = async context =>
    {
        var jti  = context.Principal!.FindFirstValue(JwtRegisteredClaimNames.Jti);
        var svc  = context.HttpContext.RequestServices.GetRequiredService<TokenRevocationService>();

        if (await svc.IsRevokedAsync(jti!))
        {
            context.Fail("Token has been revoked");
        }
    }
};`;

  codeExample3 = `OrdersController.cs — Defensas completas
  
// ─── 1. IDOR: validar ownership del recurso ────────────────────────
[HttpGet("{id:guid}"), Authorize]
public async Task<IActionResult> GetOrder(Guid id)
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    var order  = await _repo.GetByIdAsync(id);

    if (order is null)                return NotFound();
    if (order.UserId != userId)        return Forbid();  // IDOR bloqueado

    return Ok(_mapper.Map<OrderResponse>(order));
}

// ─── 2. Mass Assignment: DTO inmutable, nunca entidad directa ──────
public record CreateOrderRequest(       // solo los campos que el cliente puede enviar
    IReadOnlyList<OrderItemDto> Items,
    string DeliveryAddress
    // NO incluir: IsVip, DiscountOverride, InternalNotes, UserId
);

// ─── 3. Security Headers en Program.cs ────────────────────────────
app.Use(async (ctx, next) =>
{
    var headers = ctx.Response.Headers;
    headers.Append("X-Content-Type-Options",       "nosniff");
    headers.Append("X-Frame-Options",               "DENY");
    headers.Append("X-XSS-Protection",              "1; mode=block");
    headers.Append("Referrer-Policy",               "strict-origin-when-cross-origin");
    headers.Append("Strict-Transport-Security",     "max-age=31536000; includeSubDomains");
    headers.Append("Content-Security-Policy",       "default-src 'none'; frame-ancestors 'none'");
    headers.Append("Permissions-Policy",            "geolocation=(), microphone=()");
    // Eliminar header que revela el framework
    headers.Remove("Server");
    headers.Remove("X-Powered-By");
    await next();
});`;

  codeExample4 = `Program.cs — Rate Limiting nativo .NET 7+

builder.Services.AddRateLimiter(options =>
{
    // Política global: anónimos 20 req/min por IP
    options.AddSlidingWindowLimiter("anonymous", opt =>
    {
        opt.PermitLimit        = 20;
        opt.Window             = TimeSpan.FromMinutes(1);
        opt.SegmentsPerWindow  = 4;    // precisión de la ventana
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit         = 2;
    });

    // Política por usuario autenticado: 200 req/min por userId
    options.AddPolicy("authenticated", context =>
    {
        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? context.Connection.RemoteIpAddress?.ToString()
                     ?? "unknown";

        return RateLimitPartition.GetSlidingWindowLimiter(userId, _ =>
            new SlidingWindowRateLimiterOptions
            {
                PermitLimit       = 200,
                Window            = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6
            });
    });

    // Endpoint crítico: login — 5 intentos por IP por minuto
    options.AddPolicy("login", context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ =>
            new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window      = TimeSpan.FromMinutes(1),
            });
    });

    // Respuesta 429 con Retry-After header
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, ct) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            context.HttpContext.Response.Headers.RetryAfter =
                ((int)retryAfter.TotalSeconds).ToString();
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            type   = "https://api.miapp.com/errors/rate-limit-exceeded",
            title  = "Too Many Requests",
            status = 429,
            detail = "Has excedido el límite de requests. Consulta el header Retry-After."
        }, ct);
    };
});

// Usar en endpoints específicos
app.UseRateLimiter();
// [EnableRateLimiting("login")] en el endpoint de auth`;

  codeExample5 = `Program.cs — Hardening completo

// ─── 1. HTTPS + HSTS ─────────────────────────────────────────────
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();  // Strict-Transport-Security: max-age=2592000
}
app.UseHttpsRedirection();

// ─── 2. CORS con lista blanca explícita ──────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("production", policy =>
        policy
            .WithOrigins(
                "https://app.miapp.com",
                "https://admin.miapp.com")     // NUNCA AllowAnyOrigin
            .WithMethods("GET", "POST", "PUT", "DELETE")
            .WithHeaders("Authorization", "Content-Type")
            .AllowCredentials());
    // AllowAnyOrigin + AllowCredentials = error de seguridad + excepción en runtime
});

// ─── 3. Data Protection — claves persisten entre reinicios del pod ─
builder.Services.AddDataProtection()
    .PersistKeysToAzureBlobStorage(         // claves en Azure Blob Storage
        blobUri:    new Uri(builder.Configuration["DataProtection:BlobUri"]!),
        credential: new DefaultAzureCredential())
    .ProtectKeysWithAzureKeyVault(           // cifradas con Key Vault
        keyId:      builder.Configuration["DataProtection:KeyVaultUri"]!,
        credential: new DefaultAzureCredential())
    .SetApplicationName("miapp-api");

// ─── 4. Audit Log para operaciones sensibles ─────────────────────
// En el service/handler, no en el controller
public async Task DeleteOrderAsync(Guid orderId, string userId)
{
    _logger.LogInformation(
        "AUDIT | Action=DeleteOrder | OrderId={OrderId} | UserId={UserId} | IP={IP}",
        orderId, userId, _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress);
    // El structured logging de Serilog hace cada campo queryable en KQL
}`;

}
