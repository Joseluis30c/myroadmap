import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week2',
  imports: [RouterLink],
  templateUrl: './week2.html',
})
export class Week2 {
  codeExample1 = `// Sección Skills — formato que los recruiters de tech esperan

Languages & Runtimes:   C# (.NET 8), SQL (T-SQL), YAML
Frameworks & Libraries: ASP.NET Core, Entity Framework Core, MediatR,
                        MassTransit, Serilog, FluentValidation, xUnit
Cloud & DevOps:         Azure (App Service, Container Apps, Key Vault,
                        Service Bus, SQL, Blob Storage, App Insights),
                        GitHub Actions, Azure DevOps, Docker
Architecture:           Microservices, Clean Architecture, CQRS,
                        Domain-Driven Design, Event-Driven Architecture
Databases & Caching:    SQL Server (indexing, execution plans),
                        Redis (Cache-Aside, Pub/Sub), Azure SQL
Security:               OAuth 2.0, OpenID Connect, JWT, OWASP Top 10

// REGLA: no incluir tecnologías que no puedas explicar en una entrevista
// Cada item es una pregunta potencial — si lo pones, prepárate para responderla`;

  codeExample2 = `Subject: Application for Senior .NET Backend Developer — [Nombre]

// Párrafo 1: conexión directa (2-3 frases)
I've spent the past year building production-grade microservices
using .NET 8, Azure Container Apps, and event-driven architecture —
which maps directly to the technical requirements in your job post.

// Párrafo 2: logro más relevante con métrica (2-3 frases)
Most recently I designed and deployed a 6-service platform that
reduced deployment time from 45 to 8 minutes via GitHub Actions,
while maintaining <150ms P99 latency under load — measured
and monitored through Azure Application Insights.

// Párrafo 3: por qué esta empresa (1-2 frases — personalizar)
I'm particularly interested in [Company] because [specific reason
related to their tech stack, product, or engineering culture].

// Cierre: claro y sin relleno
I'd love to discuss how I can contribute.
GitHub: github.com/[user] | LinkedIn: linkedin.com/in/[user]`;

}
