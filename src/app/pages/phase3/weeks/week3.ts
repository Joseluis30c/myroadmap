import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week3',
  imports: [RouterLink],
  templateUrl: './week3.html',
})
export class Week3 {
  codeExample1 = `.env (agregar a .gitignore ahora)

# ── Variables de entorno para DEV local ─────────────────────────
# Copia este archivo como .env.example para el repo (sin valores)
ASPNETCORE_ENVIRONMENT=Development
ASPNETCORE_HTTP_PORTS=8080

# SQL Server
SA_PASSWORD=Dev_Pass!2024
DB_NAME=MiApiDb
CONNECTION_STRING=Server=db;Database=MiApiDb;User Id=sa;Password=Dev_Pass!2024;TrustServerCertificate=True

# JWT
JWT_SECRET=dev-only-secret-key-minimum-32-chars!!
JWT_EXPIRY_HOURS=24
JWT_ISSUER=http://localhost:8080

# Azure Storage (opcional en dev)
STORAGE_CONNECTION=UseDevelopmentStorage=true`;

  codeExample2 = `Program.cs — IConfiguration lee automáticamente

// ─── IConfiguration lee env vars automáticamente ───────────────
// Separador jerárquico: __ (doble guion bajo)
// "ConnectionStrings__DefaultConnection" → ConnectionStrings:DefaultConnection
// "Jwt__Secret" → Jwt:Secret

// ❌ NO hagas esto — hardcoded en el código
// var connStr = "Server=localhost;Database=...";

// ✅ IConfiguration lee de: appsettings.json → appsettings.{env}.json
//    → Variables de entorno (mayor prioridad)
//    → User Secrets (solo en Development)
var connStr = builder.Configuration.GetConnectionString("DefaultConnection");
var jwtSecret = builder.Configuration["Jwt:Secret"];

// En Docker, las env vars tienen la mayor prioridad
// → siempre sobreescriben el appsettings.json
// Esto significa que el mismo Dockerfile sirve para dev y prod,
// solo cambian las variables de entorno inyectadas

// ─── appsettings.json — valores por defecto ────────────────────
/*
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;..." // valor local por defecto
  },
  "Jwt": {
    "Secret": "PLACEHOLDER_OVERRIDDEN_BY_ENV",
    "ExpiryHours": 24
  }
}
*/`;

}
