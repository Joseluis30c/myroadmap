import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-week1',
  imports: [RouterLink],
  templateUrl: './week1.html',
})
export class Week1 {

codeExample1 = `var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.Use(async (context, next) => {
Console.WriteLine($"[IN] {context.Request.Method} {context.Request.Path}");
await next(context);
Console.WriteLine($"[OUT] Status: {context.Response.StatusCode}");
});

app.MapGet("/hello", () => "¡Ciclo completo!");
app.Run();
`;

codeExample2 = `public class TimingMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        await next(context);
        sw.Stop();
        context.Response.Headers["X-Response-Time-ms"] 
            = sw.ElapsedMilliseconds.ToString();
    }
}

// Registrar en Program.cs:
app.UseMiddleware&lt;TimingMiddleware&gt;();
`;

codeExample3 = `public interface IMyService { Guid Id { get; } }
public class MyService : IMyService { public Guid Id { get; } = Guid.NewGuid(); }

// En Program.cs:
builder.Services.AddTransient&lt;IMyService, MyService&gt;(); // cambia a Scoped/Singleton

app.MapGet("/test", (IMyService s1, IMyService s2) => 
    new { Same = s1.Id == s2.Id, Id1 = s1.Id, Id2 = s2.Id });
`;

codeExample4 = `// ApiSettings.cs
public class ApiSettings
{
    public const string SectionName = "Api";
    [Required] public string Name { get; set; } = "";
    [Range(1, 65535)] public int Port { get; set; } = 5000;
}

// Program.cs
builder.Services
    .AddOptions&lt;ApiSettings&gt;()
    .BindConfiguration(ApiSettings.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart(); // falla rápido si config es inválida

// appsettings.json
{
"Api": { "Name": "Mi API", "Port": 5001 }
}
`;

codeExample5 = `// Program.cs – API estructurada final
// 1. Serilog
builder.Host.UseSerilog((ctx, cfg) =>
cfg.ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}"));

// 2. Servicios con DI
builder.Services.AddScoped&lt;IProductService, ProductService&gt;();
builder.Services.AddOptions&lt;ApiSettings&gt;()
.BindConfiguration("Api").ValidateDataAnnotations().ValidateOnStart();

// 3. Middleware pipeline
app.UseMiddleware&lt;TimingMiddleware&gt;();     // timing custom
app.UseSerilogRequestLogging();            // log de cada request
app.UseExceptionHandler("/error");         // manejo de errores
app.UseHttpsRedirection();
app.UseAuthorization();

// 4. Endpoints
app.MapGet("/products", async (IProductService svc, 
ILogger&lt;Program&gt; logger) => {
logger.LogInformation("Fetching all products");
return await svc.GetAllAsync();
});

app.Run();`;

}
