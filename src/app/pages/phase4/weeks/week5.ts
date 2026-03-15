import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week5',
  imports: [RouterLink],
  templateUrl: './week5.html',
})
export class Week5 {
  codeExample1 = `public async Task CreateOrder(
  string userId, List<int> ids,
  string addr, bool isPriority)
{
  if (ids.Count > 50) throw...
  decimal total = 0;
  foreach (var id in ids) {
    var p = await _db.Products
      .FirstOrDefault(x => x.Id==id);
    if (p == null) continue;
    total += p.Price * 1.16m;
  }
  if (isPriority) total += 9.99m;
  var o = new Order { ... };
  _db.Orders.Add(o);
  await _db.SaveChangesAsync();
  // enviar email
  await _smtp.Send(userId, ...);
}`;

  codeExample2 = `public async Task<Result> Handle(
  CreateOrderCommand cmd)
{
  var items = await _catalog
    .GetItemsAsync(cmd.ProductIds);

  var order = Order.Create(
    cmd.CustomerId,
    items,
    cmd.DeliveryAddress,
    cmd.ShippingOption);

  await _orders.AddAsync(order);
  await _events.PublishAsync(
    new OrderCreatedEvent(order));

  return Result.Success(order.Id);
}`;

  codeExample3 = `Email.cs — Value Object con validación en el constructor

// ANTES: Primitive Obsession
// string email — puede ser null, vacío, o "not-an-email"
// La validación se duplica en cada lugar donde se usa
public class OrderService
{
    public void Notify(string email) // ¿válido? ¿null? ¿vacío?
    {
        if (!email.Contains("@")) throw ...; // duplicado en 5 lugares
    }
}

// DESPUÉS: Value Object — imposible crear un Email inválido
public sealed record Email
{
    public string Value { get; }

    private Email(string value) => Value = value;

    public static Result<Email> Create(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return Result.Failure<Email>("Email is required");

        if (!Regex.IsMatch(value, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            return Result.Failure<Email>("Invalid email format");

        return Result.Success(new Email(value.ToLowerInvariant()));
    }

    public static implicit operator string(Email e) => e.Value;
    public override string ToString() => Value;
}

// Uso: la validación está en un solo lugar para siempre
public record Customer(Email Email, Money Balance); // ambos son Value Objects`;

  codeExample4 = `Order.cs — Rich Domain Model

// ANÉMICO (anti-patrón): la entidad es solo datos
// La lógica vive en OrderService — partido en dos
public class Order { public OrderStatus Status { get; set; } }
public class OrderService
{
    public void Cancel(Order o) {         // lógica fuera del objeto
        if (o.Status != OrderStatus.Pending) throw...;
        o.Status = OrderStatus.Cancelled;
    }
}

// RICH DOMAIN MODEL (correcto): el objeto conoce sus reglas
public class Order
{
    public OrderStatus Status { get; private set; } // solo el objeto se modifica
    private readonly List<DomainEvent> _events = [];
    public IReadOnlyList<DomainEvent> DomainEvents => _events;

    public Result Cancel(string reason)         // la lógica DENTRO del objeto
    {
        if (Status is not OrderStatus.Pending and not OrderStatus.Confirmed)
            return Result.Failure("Only pending or confirmed orders can be cancelled");

        Status = OrderStatus.Cancelled;
        _events.Add(new OrderCancelledEvent(Id, reason, DateTime.UtcNow));
        return Result.Success();
    }

    public static Order Create(CustomerId customerId, IReadOnlyList<OrderItem> items)
    {
        // Factory method — invariantes garantizados al crear
        if (!items.Any()) throw new DomainException("Order must have at least one item");
        var order = new Order { CustomerId = customerId, Status = OrderStatus.Pending };
        order._events.Add(new OrderCreatedEvent(order.Id));
        return order;
    }
}`;

  codeExample5 = `docs/architecture.md

— Diagrama C4 Container con Mermaid
'''mermaid
C4Container
    title Arquitectura de Contenedores — MiApp

    Person(user, "Usuario", "Cliente de la app")

    System_Boundary(miapp, "MiApp") {
        Container(gateway, "API Gateway", "YARP / ASP.NET Core", "Enruta y autentica")
        Container(orders, "Orders API", ".NET 8", "Gestión de pedidos")
        Container(catalog, "Catalog API", ".NET 8", "Catálogo de productos")
        ContainerDb(ordersDb, "Orders DB", "SQL Server", "Pedidos y líneas")
        ContainerDb(catalogDb, "Catalog DB", "SQL Server", "Productos e inventario")
        Container(redis, "Redis Cache", "Redis 7", "Caché distribuida")
        Container(bus, "Message Bus", "Azure Service Bus", "Eventos de dominio")
    }

    System_Ext(auth, "Auth Server", "Azure Entra ID / Keycloak")
    System_Ext(appinsights, "App Insights", "Telemetría y logs")

    Rel(user, gateway, "HTTPS / REST")
    Rel(gateway, auth, "Validar JWT")
    Rel(gateway, orders, "Proxy /api/v*/orders")
    Rel(gateway, catalog, "Proxy /api/v*/products")
    Rel(orders, ordersDb, "EF Core")
    Rel(orders, redis, "Cache-Aside")
    Rel(orders, bus, "Publish events")
    Rel(catalog, catalogDb, "EF Core")
    Rel(orders, appinsights, "Serilog sink")
'''`;

  codeExample6 = `.github/pull_request_template.md

## ¿Qué problema resuelve este PR?
<!-- Una o dos frases. El contexto de por qué este cambio existe. -->

## ¿Qué cambia?
<!-- Lista de cambios clave. No es un diff — es el resumen humano. -->
- Extrae 'Email' como Value Object con validación en el constructor
- Elimina validación duplicada en 'OrderService', 'UserService' y 'NotificationService'
- Agrega tests para 'Email.Create()' con casos inválidos

## ¿Cómo verificar que funciona?
<!-- Pasos concretos para el revisor. -->
1. 'dotnet test' — todos los tests pasan
2. Crear un usuario con email inválido → debe devolver 422 con el error de validación
3. Crear un usuario con email válido → debe funcionar igual que antes

## Checklist
- [ ] Tests agregados o actualizados
- [ ] No hay código comentado ni TODOs nuevos sin issue asociado
- [ ] Swagger actualizado si se cambia la API pública
- [ ] Sin secrets ni datos PII en el código
- [ ] Commits siguen Conventional Commits: feat/fix/refactor/docs/test`;

}
