import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week1',
  imports: [RouterLink],
  templateUrl: './week1.html',
})
export class Week1 {
  codeExample1 = `--azure_setup.sh

# ─── 1. Login y seleccionar suscripción ───
az login
az account list --output table
az account set --subscription "[tu-subscription-id]"

# ─── 2. Crear Resource Group (contenedor de todos tus recursos) ───
az group create \
  --name     "rg-miapi-dev" \
  --location "eastus"

# Verificar
az group list --output table

# ─── 3. Variables de entorno (mejor que hardcodear) ───
export RESOURCE_GROUP="rg-miapi-dev"
export LOCATION="eastus"
export APP_NAME="miapi-$(date +%s)"  # nombre único
export SQL_SERVER="sql-miapi-dev"
export SQL_DB="db-miapi"

# ─── 4. Nomenclatura recomendada Microsoft ───
# rg-[proyecto]-[env]     → rg-miapi-dev
# app-[proyecto]-[env]    → app-miapi-dev
# sql-[proyecto]-[env]    → sql-miapi-dev
# st[proyecto][env]       → stmiapistg (Storage: sin guiones)
# vnet-[proyecto]-[env]   → vnet-miapi-dev

# ─── 5. Limpiar todo al terminar (solo en dev!) ───
# az group delete --name "rg-miapi-dev" --yes --no-wait
# Elimina TODOS los recursos del grupo en un solo comando`;

  codeExample2 = `// Connection string en appsettings.json (DEV local)
// En Azure: App Settings sobreescriben automáticamente
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(
        builder.Configuration
            .GetConnectionString("DefaultConnection"),
        sqlOpt => {
            // Retry automático para errores transitorios en Azure
            sqlOpt.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorNumbersToAdd: null);
        }));

// Aplicar migrations al iniciar (dev/staging solamente)
if (app.Environment.IsDevelopment() ||
    app.Environment.IsStaging())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider
        .GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync(); // aplica migrations pendientes
}`;

  codeExample3 = `//StorageService.cs

// NuGet: Azure.Storage.Blobs
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

public class BlobStorageService(BlobServiceClient blobClient)
{
    private const string Container = "uploads";

    public async Task<string> UploadAsync(
        IFormFile file, CancellationToken ct)
    {
        var container = blobClient.GetBlobContainerClient(Container);
        await container.CreateIfNotExistsAsync(
            PublicAccessType.None, // sin acceso público directo
            cancellationToken: ct);

        var blobName  = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var blobRef   = container.GetBlobClient(blobName);

        await using var stream = file.OpenReadStream();
        await blobRef.UploadAsync(stream, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders
                { ContentType = file.ContentType }
        }, ct);

        return blobRef.Uri.ToString();
    }

    public Uri GetSasUrl(string blobName, int expiryMinutes = 60)
    {
        var blobRef = blobClient
            .GetBlobContainerClient(Container)
            .GetBlobClient(blobName);

        return blobRef.GenerateSasUri(BlobSasPermissions.Read,
            DateTimeOffset.UtcNow.AddMinutes(expiryMinutes));
    }
}

// Program.cs — registrar el cliente
builder.Services.AddSingleton(new BlobServiceClient(
    builder.Configuration["Storage:ConnectionString"]));`;

  codeExample4 = `Program.cs

// ─── Application Insights + Health Check ───
builder.Services.AddApplicationInsightsTelemetry();

builder.Services.AddHealthChecks()
    .AddSqlServer(
        builder.Configuration
            .GetConnectionString("DefaultConnection")!)
    .AddAzureBlobStorage(
        builder.Configuration["Storage:ConnectionString"]!);

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});
// GET /health → { "status":"Healthy","checks":[{"name":"sqlserver"...}]}`;

}
