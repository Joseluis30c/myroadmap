import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week5',
  imports: [RouterLink],
  templateUrl: './week5.html',
})
export class Week5 {
  codeExample1 = `redis-cli
# ─── Conectar ─────────────────────────────────────────────────────
docker exec -it redis redis-cli
redis-cli -h your-redis.redis.cache.windows.net -p 6380 -a <password> --tls

# ─── Strings (el tipo más común para cache) ───────────────────────
SET  products:electronics '{"items":[...]}'
SET  products:electronics '{"items":[...]}' EX 300   # expire en 300s
GET  products:electronics
TTL  products:electronics                             # segundos restantes (-1=sin TTL, -2=expirado)
DEL  products:electronics                             # invalidar manualmente
EXISTS products:electronics                           # 1=existe, 0=no

# ─── Patterns y monitoreo ─────────────────────────────────────────
KEYS   products:*                   # buscar claves (no usar en prod)
SCAN   0 MATCH products:* COUNT 100 # alternativa segura en prod
DBSIZE                              # total de claves en la BD
INFO   memory                       # uso de memoria
MONITOR                             # ver todos los comandos en tiempo real (debug)

# ─── Hashes (ideal para objetos con campos individuales) ──────────
HSET   user:42 name "Ana" email "ana@test.com" role "admin"
HGET   user:42 name
HGETALL user:42
HSET   user:42 lastLogin "2024-03-01"   # actualizar solo un campo

# ─── Patrones de claves recomendados ──────────────────────────────
# [entidad]:[id]                → user:42
# [entidad]:[filtro]            → products:electronics
# [entidad]:[id]:[sub]          → orders:42:items
# [feature]:[tenant]:[key]      → reports:acme:monthly`;

  codeExample2 = `Program.cs — Registro de Redis
// NuGet: Microsoft.Extensions.Caching.StackExchangeRedis

// ─── Producción: Redis ─────────────────────────────────────────────
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration["Redis:ConnectionString"];
    options.InstanceName   = "miapi:"; // prefijo de todas las claves
});

// ─── Testing: memoria (mismo IDistributedCache, sin Redis) ────────
// builder.Services.AddDistributedMemoryCache();`;

  codeExample3 = `CacheExtensions.cs — Helpers de serialización
public static class CacheExtensions
{
    private static readonly JsonSerializerOptions _opts =
        new() { PropertyNameCaseInsensitive = true };

    /// Obtener objeto tipado del cache
    public static async Task<T?> GetAsync<T>(
        this IDistributedCache cache,
        string key,
        CancellationToken ct = default)
    {
        var bytes = await cache.GetAsync(key, ct);
        return bytes is null
            ? default
            : JsonSerializer.Deserialize<T>(bytes, _opts);
    }

    /// Guardar objeto serializado con TTL
    public static async Task SetAsync<T>(
        this IDistributedCache cache,
        string key,
        T value,
        TimeSpan ttl,
        CancellationToken ct = default)
    {
        var bytes = JsonSerializer.SerializeToUtf8Bytes(value, _opts);
        await cache.SetAsync(key, bytes,
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ttl
            }, ct);
    }

    /// Patrón Cache-Aside en una sola llamada
    public static async Task<T> GetOrSetAsync<T>(
        this IDistributedCache cache,
        string key,
        Func<Task<T>> factory,
        TimeSpan ttl,
        CancellationToken ct = default)
    {
        var cached = await cache.GetAsync<T>(key, ct);
        if (cached is not null) return cached;  // CACHE HIT

        // CACHE MISS: obtener de la fuente real
        var fresh = await factory();
        await cache.SetAsync(key, fresh, ttl, ct);
        return fresh;
    }
}`;

  codeExample4 = `ProductsController.cs — Usando GetOrSetAsync
[HttpGet("category/{category}")]
public async Task<IActionResult> GetByCategory(
    string category, CancellationToken ct)
{
    var cacheKey = $"products:cat:{category}";

    var products = await _cache.GetOrSetAsync(
        key:     cacheKey,
        factory: () => _productRepo.GetByCategoryAsync(category, ct),
        ttl:     TimeSpan.FromMinutes(5),   // 5 min TTL
        ct:      ct);

    return Ok(products);
    // Primera request: 300ms (miss, va a SQL)
    // Siguientes 300s: 1ms (hit, desde Redis)
}`;

  codeExample5 = `RedisService.cs — Patrones avanzados
// NuGet: StackExchange.Redis
using StackExchange.Redis;

// Program.cs — Singleton correcto (NO transient/scoped)
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(new ConfigurationOptions
    {
        EndPoints   = { builder.Configuration["Redis:Host"]! },
        Password    = builder.Configuration["Redis:Password"],
        Ssl         = true,
        AbortOnConnectFail = false,   // no crashear si Redis no está disponible
        ConnectRetry       = 3,
        ConnectTimeout     = 5000
    }));

// ─── 1. Rate Limiting con INCR atómico ────────────────────────────
public async Task<bool> IsRateLimitedAsync(string userId, int limit = 100)
{
    var db  = _redis.GetDatabase();
    var key = $"ratelimit:{userId}:{DateTime.UtcNow:yyyyMMddHH}"; // por hora

    // INCR es atómico — sin race conditions entre instancias
    var count = await db.StringIncrementAsync(key);
    if (count == 1)
        await db.KeyExpireAsync(key, TimeSpan.FromHours(1)); // primera vez: set TTL

    return count > limit;  // true = bloqueado
}

// ─── 2. Leaderboard con Sorted Set ────────────────────────────────
public async Task UpdateScoreAsync(string userId, double points)
{
    var db = _redis.GetDatabase();
    await db.SortedSetIncrementAsync("leaderboard:global", userId, points);
}

public async Task<SortedSetEntry[]> GetTopPlayersAsync(int count = 10)
{
    var db = _redis.GetDatabase();
    return await db.SortedSetRangeByRankWithScoresAsync(
        "leaderboard:global",
        start: 0, stop: count - 1,
        order: Order.Descending);  // mayor score primero
}

// ─── 3. Pub/Sub para invalidación distribuida ─────────────────────
// Publisher: cuando un producto cambia, notificar a todas las instancias
public async Task PublishCacheInvalidationAsync(string pattern)
{
    var pub = _redis.GetSubscriber();
    await pub.PublishAsync(
        RedisChannel.Literal("cache:invalidate"), pattern);
}

// Subscriber: todas las instancias escuchan y limpian su cache local
public async Task SubscribeToInvalidationsAsync()
{
    var sub = _redis.GetSubscriber();
    await sub.SubscribeAsync(
        RedisChannel.Literal("cache:invalidate"),
        (channel, pattern) => {
            // limpiar entradas de IMemoryCache que coincidan con el pattern
            _memoryCache.Remove(pattern.ToString());
        });
}`;

  codeExample6 = `CacheService.cs — Patrones avanzados
// ─── 1. Thundering Herd Protection con SemaphoreSlim ──────────────
private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

public async Task<T> GetOrSetProtectedAsync<T>(
    string key, Func<Task<T>> factory, TimeSpan ttl)
{
    // Primero: intentar sin lock (fast path)
    var cached = await _cache.GetAsync<T>(key);
    if (cached is not null) return cached;

    // Miss: obtener o crear semáforo para esta clave
    var sem = _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
    await sem.WaitAsync();
    try
    {
        // Double-check: otra request pudo haber llenado el cache
        cached = await _cache.GetAsync<T>(key);
        if (cached is not null) return cached;

        // Solo UNA request llega a la BD — las demás esperan el semáforo
        var fresh = await factory();
        await _cache.SetAsync(key, fresh, ttl);
        return fresh;
    }
    finally { sem.Release(); }
}

// ─── 2. Stale-While-Revalidate ────────────────────────────────────
// Retorna el dato stale inmediatamente, actualiza en background
public async Task<T> GetStaleWhileRevalidateAsync<T>(
    string key, Func<Task<T>> factory,
    TimeSpan freshTtl, TimeSpan staleTtl)
{
    var db   = _redis.GetDatabase();
    var data = await db.StringGetAsync(key);
    var ttl  = await db.KeyTimeToLiveAsync(key);

    if (!data.IsNullOrEmpty)
    {
        // Si el TTL está en la ventana "stale" → revalidar en background
        if (ttl < freshTtl - staleTtl)
        {
            _ = Task.Run(async () => {
                var fresh = await factory();
                await db.StringSetAsync(key,
                    JsonSerializer.Serialize(fresh), freshTtl);
            });
        }
        return JsonSerializer.Deserialize<T>(data!)!;  // retornar stale
    }

    // No hay dato: bloquear y obtener
    var result = await factory();
    await db.StringSetAsync(key,
        JsonSerializer.Serialize(result), freshTtl);
    return result;
}`;

  codeExample7 = `Program.cs — Output Cache + Redis
// .NET 8: Output Cache con Redis como backing store
builder.Services.AddOutputCache(opts =>
{
    // Política base: 5 min, aplicar a todos los GETs
    opts.AddBasePolicy(b => b
        .Expire(TimeSpan.FromMinutes(5))
        .SetVaryByQuery("*")          // cache único por query string
        .Tag("all"));

    // Política específica para productos
    opts.AddPolicy("Products", b => b
        .Expire(TimeSpan.FromMinutes(10))
        .SetVaryByQuery("category", "page")
        .Tag("products"));
});

app.UseOutputCache();`;

  codeExample8 = `ProductsController.cs — Endpoint con cache + métricas
// Output Cache declarativo: el más simple posible
[HttpGet("category/{category}")]
[OutputCache(PolicyName = "Products")]
public async Task<IActionResult> GetByCategory(
    string category, CancellationToken ct)
{
    // Este código solo corre en cache MISS
    _logger.LogInformation(
        "Cache MISS for products:cat:{Category} — querying DB", category);

    var products = await _repo.GetByCategoryAsync(category, ct);
    return Ok(products);
}

// Invalidar cuando se crea/actualiza un producto
[HttpPost]
public async Task<IActionResult> Create(
    CreateProductRequest req,
    [FromServices] IOutputCacheStore cache,
    CancellationToken ct)
{
    var product = await _repo.CreateAsync(req, ct);

    // Invalidar TODAS las entradas con tag "products"
    await cache.EvictByTagAsync("products", ct);
    _logger.LogInformation(
        "Cache invalidated: tag=products after product {ProductId} created",
        product.Id);

    return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
}

// Métricas de cache — cuántas requests se sirven desde cache
// Log Analytics KQL para medir hit ratio:
// traces
// | where message contains "Cache"
// | summarize
//     hits   = countif(message contains "HIT"),
//     misses = countif(message contains "MISS")
// | extend hitRatio = round(100.0 * hits / (hits + misses), 2)`;

}
