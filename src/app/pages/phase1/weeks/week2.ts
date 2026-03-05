import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week2',
  imports: [RouterLink],
  templateUrl: './week2.html',
})
export class Week2 {

  codeExample1 = `public abstract class Entity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    private readonly List<IDomainEvent> _events = [];
    public IReadOnlyList<IDomainEvent> DomainEvents => _events;
    protected void RaiseDomainEvent(IDomainEvent e) => _events.Add(e);
}

// Domain/Entities/Product.cs — entidad con invariantes
public class Product : Entity
{
    public string Name { get; private set; }
    public Money Price { get; private set; }

    private Product() { } // EF Core

    public static Product Create(string name, Money price)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Name is required");
        return new Product { Name = name, Price = price };
    }
}

// Domain/ValueObjects/Money.cs
public record Money(decimal Amount, string Currency)
{
    public static Money Of(decimal amount, string currency)
    {
        if (amount < 0) throw new DomainException("Amount can't be negative");
        return new Money(amount, currency);
    }
}`;

codeExample2 = `// Application/Interfaces/IProductRepository.cs
public interface IProductRepository
{
    Task<Product?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Product>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(Product product, CancellationToken ct = default);
}

// Application/Services/ProductService.cs
public class ProductService(IProductRepository repo, IUnitOfWork uow)
{
    public async Task<ProductDto> CreateAsync(CreateProductRequest req)
    {
        var price = Money.Of(req.Price, req.Currency); // Domain invariant
        var product = Product.Create(req.Name, price);  // Domain factory
        await repo.AddAsync(product);
        await uow.SaveChangesAsync();
        return product.ToDto(); // mapeo a DTO de salida
    }
}`;

codeExample3 = `// Infrastructure/Persistence/Repositories/ProductRepository.cs
internal sealed class ProductRepository(AppDbContext ctx) : IProductRepository
{
    public async Task<Product?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await ctx.Products.FindAsync([id], ct);

    public async Task<IReadOnlyList<Product>> GetAllAsync(CancellationToken ct = default) =>
        await ctx.Products.AsNoTracking().ToListAsync(ct);

    public async Task AddAsync(Product product, CancellationToken ct = default) =>
        await ctx.Products.AddAsync(product, ct);
}

// Infrastructure/DependencyInjection.cs — Extension method
public static class InfrastructureExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<AppDbContext>(opts =>
            opts.UseSqlite(config.GetConnectionString("Default")));
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        return services;
    }
}`;

codeExample4 = `var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();             // Application/DependencyInjection.cs
builder.Services.AddInfrastructure(            // Infrastructure/DependencyInjection.cs
    builder.Configuration);

builder.Services.AddControllers();

var app = builder.Build();
app.MapControllers();
app.Run();`;

}
