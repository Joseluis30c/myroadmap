import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week6',
  imports: [RouterLink],
  templateUrl: './week6.html',
})
export class Week6 {
  codeExample1 = `// ✅ Paralelo real — dos operaciones independientes a la vez
var productsTask = _repo.GetProductsAsync(ct);
var categoriesTask = _repo.GetCategoriesAsync(ct);
await Task.WhenAll(productsTask, categoriesTask); // ambas corren en paralelo
var products   = productsTask.Result;
var categories = categoriesTask.Result;

// ✅ ConfigureAwait en Application/Infrastructure
public async Task<Product?> GetByIdAsync(Guid id, CancellationToken ct)
{
    return await _ctx.Products
        .AsNoTracking()
        .FirstOrDefaultAsync(p => p.Id == id, ct)
        .ConfigureAwait(false); // ← en librerías/capas internas
}

// ✅ ValueTask para hot paths (evitar allocación de Task)
public ValueTask<Product?> GetCachedAsync(Guid id)
{
    if (_cache.TryGetValue(id, out Product? cached))
        return new ValueTask<Product?>(cached); // sin allocación
    return new ValueTask<Product?>(FetchFromDbAsync(id));
}

// ✅ CancellationToken — siempre propagar hacia abajo
public async Task<IReadOnlyList<ProductDto>> GetAllAsync(
    CancellationToken ct = default)  // ← siempre el último parámetro
{
    var products = await _repo.GetAllAsync(ct).ConfigureAwait(false);
    return products.Select(p => p.ToDto()).ToList();
}`;

codeExample2 = `// IAsyncEnumerable — streaming sin cargar todo en memoria
[HttpGet("stream")]
public async IAsyncEnumerable<ProductDto> GetStream(
    [EnumeratorCancellation] CancellationToken ct)
{
    await foreach (var product in _repo.StreamAllAsync(ct))
        yield return product.ToDto();
}

// En el repositorio con EF Core
public async IAsyncEnumerable<Product> StreamAllAsync(
    [EnumeratorCancellation] CancellationToken ct)
{
    await foreach (var p in _ctx.Products.AsAsyncEnumerable().WithCancellation(ct))
        yield return p;
}

// Task.WhenAll — llamadas paralelas (no secuenciales)
var tasks = productIds.Select(id => _repo.GetByIdAsync(id, ct));
var products = await Task.WhenAll(tasks); // todas a la vez, no una por una

// Task.WhenAll con límite de paralelismo (evitar saturar la BD)
var semaphore = new SemaphoreSlim(10); // máx 10 a la vez
var tasks2 = productIds.Select(async id =>
{
    await semaphore.WaitAsync(ct).ConfigureAwait(false);
    try   { return await _repo.GetByIdAsync(id, ct).ConfigureAwait(false); }
    finally { semaphore.Release(); }
});`;


codeExample3 = `// ❌ .Result — posible deadlock
var p = _repo.GetByIdAsync(id).Result;

// ❌ await en loop secuencial
foreach (var id in ids)
    await ProcessAsync(id); // uno por uno 😢

// ❌ async void
public async void DoWork()
{
    await _svc.ProcessAsync(); // excepción perdida
}`;

codeExample4 = `// ✅ await siempre
var p = await _repo.GetByIdAsync(id);

// ✅ WhenAll para paralelismo
var tasks = ids.Select(ProcessAsync);
await Task.WhenAll(tasks); // todos a la vez 🚀

// ✅ Task siempre
public async Task DoWork()
{
    await _svc.ProcessAsync(); // excepción propagada
}`;

codeExample5 = `# Agregar al proyecto de tests o API
dotnet add package AsyncFixer

# También disponible como extensión de Visual Studio
# Y como analizador en Rider

# Reglas que detecta automáticamente:
# AF0001 — Unnecessary async/await
# AF0002 — Non-async method with async suffix
# AF0003 — Fire-and-forget async void
# AF0004 — Blocking calls inside async methods (.Result)
# AF0005 — Downcasting from Task to ValueTask`;

codeExample6 = `// Program.cs — Kestrel configurado para alto rendimiento
builder.WebHost.ConfigureKestrel(opts =>
{
    opts.Limits.MaxConcurrentConnections         = 10_000;
    opts.Limits.MaxConcurrentUpgradedConnections = 10_000;
    opts.Limits.MaxRequestBodySize               = 10 * 1024 * 1024; // 10MB
    opts.Limits.KeepAliveTimeout                 = TimeSpan.FromSeconds(65);
    opts.Limits.RequestHeadersTimeout            = TimeSpan.FromSeconds(15);
    opts.AddServerHeader                         = false; // ocultar "Server: Kestrel"
});

// Response Compression — reducir payload dramáticamente
builder.Services.AddResponseCompression(opts =>
{
    opts.EnableForHttps = true;  // habilitar también en HTTPS
    opts.Providers.Add<BrotliCompressionProvider>();
    opts.Providers.Add<GzipCompressionProvider>();
    opts.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat([
        "application/json" // comprimir JSON también
    ]);
});
builder.Services.Configure<BrotliCompressionProviderOptions>(opts =>
    opts.Level = CompressionLevel.Fastest); // velocidad > tamaño

app.UseResponseCompression(); // antes de endpoints

// Comandos para profiling desde terminal
# Instalar herramientas de diagnóstico
# dotnet tool install -g dotnet-trace
# dotnet tool install -g dotnet-counters

# Ver métricas en tiempo real
# dotnet-counters monitor --process-id <PID>

# Capturar traza de CPU por 30 segundos
# dotnet-trace collect --process-id <PID> --duration 00:00:30`;

codeExample7 = `// ❌ ANTES — endpoint lento con todos los anti-patrones
[HttpGet]
public async Task<IActionResult> GetAll()
{
    var products = await _ctx.Products       // sin AsNoTracking
        .Include(p => p.Category)            // carga categoría aunque no la uses
        .Include(p => p.Images)              // carga imágenes innecesariamente
        .ToListAsync();                      // carga TODO en memoria
    return Ok(products);                    // serializa entidades completas
}

// ✅ DESPUÉS — mismo resultado, mucho más rápido
[HttpGet]
[OutputCache(Duration = 60)]              // caché 60 segundos
public async Task<IActionResult> GetAll(CancellationToken ct)
{
    var products = await _ctx.Products
        .AsNoTracking()                      // sin change tracking
        .Select(p => new ProductSummaryDto  // proyección — solo lo necesario
        {
            Id       = p.Id,
            Name     = p.Name,
            Price    = p.Price.Amount,
            Category = p.Category.Name
        })
        .ToListAsync(ct);                    // propagar CancellationToken
    return Ok(products);
}

// IMemoryCache para datos que cambian poco (catálogos, configs)
public async Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(
    CancellationToken ct)
{
    return await _cache.GetOrCreateAsync(
        "categories",
        async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
            return await _repo.GetCategoriesAsync(ct).ConfigureAwait(false);
        }) ?? [];
}

// BenchmarkDotNet — medir el impacto de tus optimizaciones
[MemoryDiagnoser]
[SimpleJob(RuntimeMoniker.Net80)]
public class GetProductsBenchmark
{
    [Benchmark(Baseline = true)]
    public async Task WithTracking()    => await _svc.GetAllSlowAsync();

    [Benchmark]
    public async Task WithNoTracking()  => await _svc.GetAllFastAsync();
}`;

}
