import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week3',
  imports: [RouterLink],
  templateUrl: './week3.html',
})
export class Week3 {

  codeExample1 = `public class CreateProductDto
{
  [Required]
  [MaxLength(100)]
  public string Name { get; set; }

  [Range(0.01, 99999)]
  public decimal Price { get; set; }
}`;

  codeExample2 = `public class CreateProductValidator
  : AbstractValidator<CreateProductDto>
{
  public CreateProductValidator()
  {
    RuleFor(x => x.Name)
      .NotEmpty().MaximumLength(100);
    RuleFor(x => x.Price)
      .GreaterThan(0);
  }
}`;

  codeExample3 = `// Application/Products/Validators/CreateProductValidator.cs
public class CreateProductValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("El nombre es requerido")
            .MaximumLength(100).WithMessage("Máximo 100 caracteres");

        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("El precio debe ser mayor a 0");

        RuleFor(x => x.Currency)
            .NotEmpty()
            .Length(3).WithMessage("Moneda debe ser código ISO de 3 letras")
            .Matches(@"^[A-Z]{3}$").WithMessage("Ej: USD, PEN, EUR");
    }
}

// Unit test del validator (sin necesidad de levantar la API)
public class CreateProductValidatorTests
{
    private readonly CreateProductValidator _validator = new();

    [Fact]
    public void Should_Fail_When_Name_Is_Empty()
    {
        var result = _validator.TestValidate(new CreateProductRequest { Name = "" });
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }
}`;

codeExample4 = `// Application/Common/Behaviors/ValidationBehavior.cs
public class ValidationBehavior<TRequest>(IEnumerable<IValidator<TRequest>> validators)
{
    public async Task ValidateAsync(TRequest request, CancellationToken ct)
    {
        if (!validators.Any()) return;

        var context = new ValidationContext<TRequest>(request);
        var results = await Task.WhenAll(
            validators.Select(v => v.ValidateAsync(context, ct)));

        var failures = results
            .SelectMany(r => r.Errors)
            .Where(e => e != null)
            .ToList();

        if (failures.Count > 0)
            throw new ValidationException(failures);
    }
}

// Registro en Application/DependencyInjection.cs
services.AddValidatorsFromAssembly(
    Assembly.GetExecutingAssembly()); // auto-registra todos los validators`;


codeExample5 = `// Api/Exceptions/ValidationExceptionHandler.cs
public class ValidationExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext ctx, Exception ex, CancellationToken ct)
    {
        if (ex is not ValidationException vEx) return false;

        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        await ctx.Response.WriteAsJsonAsync(new
        {
            type    = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
            title   = "Validation Error",
            status  = 400,
            errors  = vEx.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key,
                              g => g.Select(e => e.ErrorMessage).ToArray())
        }, ct);
        return true;
    }
}

// Api/Exceptions/NotFoundExceptionHandler.cs
public class NotFoundExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext ctx, Exception ex, CancellationToken ct)
    {
        if (ex is not NotFoundException nfEx) return false;

        ctx.Response.StatusCode = 404;
        await ctx.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Type     = "https://tools.ietf.org/html/rfc9110#section-15.5.5",
            Title    = "Not Found",
            Status   = 404,
            Detail   = nfEx.Message,
            Instance = ctx.Request.Path
        }, ct);
        return true;
    }
}

// Program.cs — registrar en orden
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddExceptionHandler<NotFoundExceptionHandler>();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>(); // fallback
builder.Services.AddProblemDetails();
app.UseExceptionHandler();`;

codeExample6 = `// Domain/Common/Error.cs
public record Error(string Code, string Description)
{
    public static readonly Error None = new("", "");
    public static Error NotFound(string id) =>
        new("NotFound", $"Resource '{id}' not found");
    public static Error Conflict(string msg) => new("Conflict", msg);
}

// Domain/Common/Result.cs
public class Result<T>
{
    private Result(T value)  { Value = value; IsSuccess = true;  Error = Error.None; }
    private Result(Error err) { IsSuccess = false; Error = err; }

    public bool    IsSuccess { get; }
    public T?      Value     { get; }
    public Error   Error     { get; }

    public static Result<T> Success(T value)   => new(value);
    public static Result<T> Failure(Error err) => new(err);
}

// Uso en el Application Service
public async Task<Result<ProductDto>> GetByIdAsync(Guid id)
{
    var product = await _repo.GetByIdAsync(id);
    if (product is null)
        return Result<ProductDto>.Failure(Error.NotFound(id.ToString()));
    return Result<ProductDto>.Success(product.ToDto());
}

// Controller: convierte Result a HTTP sin try/catch
var result = await _service.GetByIdAsync(id);
return result.IsSuccess
    ? Ok(result.Value)
    : Problem(result.Error.Description, statusCode: 404);`;

codeExample7 = `var builder = WebApplication.CreateBuilder(args);

// Capas (Semana 2)
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// FluentValidation (auto-registro de todos los validators)
builder.Services.AddValidatorsFromAssemblyContaining<CreateProductValidator>();

// Manejo global de errores — orden importa
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddExceptionHandler<NotFoundExceptionHandler>();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// API Versioning
builder.Services.AddApiVersioning(opts => {
    opts.DefaultApiVersion = new ApiVersion(1);
    opts.AssumeDefaultVersionWhenUnspecified = true;
    opts.ReportApiVersions = true;
}).AddApiExplorer(opts => {
    opts.GroupNameFormat = "'v'VVV";
    opts.SubstituteApiVersionInUrl = true;
});

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(opts =>
        // Deshabilitar validación automática para usar nuestro handler
        opts.SuppressModelStateInvalidFilter = true);

var app = builder.Build();

app.UseExceptionHandler();   // antes de routing
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();`;

codeExample8 = `[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1")]
public class ProductsController(IProductService service) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return result.IsSuccess ? Ok(result.Value)
            : Problem(result.Error.Description, statusCode: 404);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateProductRequest req)
    {
        // FluentValidation ya validó automáticamente via ValidationBehavior
        // Si llegamos aquí, el input es válido
        var result = await service.CreateAsync(req);
        return result.IsSuccess
            ? CreatedAtAction(nameof(GetById),
                new { id = result.Value!.Id }, result.Value)
            : Problem(result.Error.Description, statusCode: 409);
    }
}`;

}
