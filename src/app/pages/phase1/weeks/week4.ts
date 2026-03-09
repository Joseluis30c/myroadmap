import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week4',
  imports: [RouterLink],
  templateUrl: './week4.html',
})
export class Week4 {

  codeExample1 = `// Tests/Domain/ProductTests.cs
public class ProductTests
{
    [Fact]
    public void Create_WithValidData_ReturnsProduct()
    {
        // Arrange
        var name  = "Laptop";
        var price = Money.Of(999.99m, "USD");

        // Act
        var product = Product.Create(name, price);

        // Assert
        product.Name.Should().Be(name);
        product.Price.Should().Be(price);
        product.Id.Should().NotBeEmpty();
    }

    [Fact]
    public void Create_WithEmptyName_ThrowsDomainException()
    {
        // Act
        Action act = () => Product.Create("", Money.Of(10, "USD"));

        // Assert
        act.Should().Throw<DomainException>()
           .WithMessage("*Name is required*");
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(-0.01)]
    [InlineData(double.MinValue)]
    public void Money_WithNegativeAmount_ThrowsDomainException(double amount)
    {
        Action act = () => Money.Of((decimal)amount, "USD");
        act.Should().Throw<DomainException>();
    }
}`;

codeExample2 = `// Setup básico
var repoMock = new Mock<IProductRepository>();

repoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync(product);

// Setup condicional — devuelve distinto según el argumento
repoMock.Setup(r => r.GetByIdAsync(knownId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(product);
repoMock.Setup(r => r.GetByIdAsync(unknownId, It.IsAny<CancellationToken>()))
        .ReturnsAsync((Product?)null);

// Setup que lanza excepción
repoMock.Setup(r => r.AddAsync(It.IsAny<Product>(), It.IsAny<CancellationToken>()))
        .ThrowsAsync(new DbException("Connection failed"));

// Verify — asegura que se llamó el método
repoMock.Verify(r => r.AddAsync(
    It.Is<Product>(p => p.Name == "Laptop"),
    It.IsAny<CancellationToken>()),
    Times.Once);

// Verify — que NUNCA se llamó
repoMock.Verify(r => r.AddAsync(
    It.IsAny<Product>(), It.IsAny<CancellationToken>()),
    Times.Never);

// Acceder al objeto mock real
IProductRepository repo = repoMock.Object;
var sut = new ProductService(repo, uowMock.Object);`;

codeExample3 = `public class ProductServiceTests
{
    // Setup compartido via constructor (xUnit crea nueva instancia por test)
    private readonly Mock<IProductRepository> _repoMock = new();
    private readonly Mock<IUnitOfWork> _uowMock = new();
    private readonly ProductService _sut;

    public ProductServiceTests()
    {
        _sut = new ProductService(_repoMock.Object, _uowMock.Object);
    }

    [Fact]
    public async Task CreateAsync_WithValidData_ReturnsSuccessResult()
    {
        // Arrange
        var request = new CreateProductRequest("Laptop", 999m, "USD");
        _uowMock.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(1);

        // Act
        var result = await _sut.CreateAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Name.Should().Be("Laptop");

        _repoMock.Verify(r => r.AddAsync(
            It.Is<Product>(p => p.Name == "Laptop"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetByIdAsync_WhenProductNotFound_ReturnsFailureResult()
    {
        // Arrange
        var id = Guid.NewGuid();
        _repoMock.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
                 .ReturnsAsync((Product?)null);

        // Act
        var result = await _sut.GetByIdAsync(id);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("NotFound");

        _uowMock.Verify(u => u.SaveChangesAsync(
            It.IsAny<CancellationToken>()), Times.Never);
    }
}`;
codeExample4 = `// Tests/Common/Builders/ProductBuilder.cs
public class ProductBuilder
{
    private string _name     = "Default Product";
    private decimal _price   = 10.00m;
    private string _currency = "USD";

    public ProductBuilder WithName(string name)      { _name = name;         return this; }
    public ProductBuilder WithPrice(decimal price)   { _price = price;       return this; }
    public ProductBuilder WithCurrency(string cur)   { _currency = cur;      return this; }

    public Product Build() =>
        Product.Create(_name, Money.Of(_price, _currency));
}

// Uso en tests — muy limpio
var product = new ProductBuilder()
    .WithName("Laptop")
    .WithPrice(1500m)
    .Build();`;

codeExample5 = `public class ProductsControllerTests
{
    private readonly Mock<IProductService> _serviceMock = new();
    private readonly ProductsController _sut;

    public ProductsControllerTests()
    {
        _sut = new ProductsController(_serviceMock.Object);
        // Necesario para que Problem() funcione en unit tests
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    [Fact]
    public async Task GetById_WhenProductExists_Returns200WithProduct()
    {
        // Arrange
        var dto = new ProductDto(Guid.NewGuid(), "Laptop", 999m, "USD");
        _serviceMock.Setup(s => s.GetByIdAsync(dto.Id))
                    .ReturnsAsync(Result<ProductDto>.Success(dto));

        // Act
        var result = await _sut.GetById(dto.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.StatusCode.Should().Be(200);
        okResult.Value.Should().BeEquivalentTo(dto);
    }

    [Fact]
    public async Task GetById_WhenNotFound_Returns404()
    {
        // Arrange
        var id = Guid.NewGuid();
        _serviceMock.Setup(s => s.GetByIdAsync(id))
                    .ReturnsAsync(Result<ProductDto>.Failure(
                        Error.NotFound(id.ToString())));

        // Act
        var result = await _sut.GetById(id);

        // Assert
        var problemResult = result.Should().BeOfType<ObjectResult>().Subject;
        problemResult.StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task Create_WithValidRequest_Returns201WithLocation()
    {
        // Arrange
        var req = new CreateProductRequest("Laptop", 999m, "USD");
        var dto = new ProductDto(Guid.NewGuid(), "Laptop", 999m, "USD");
        _serviceMock.Setup(s => s.CreateAsync(req))
                    .ReturnsAsync(Result<ProductDto>.Success(dto));

        // Act
        var result = await _sut.Create(req);

        // Assert
        var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        created.StatusCode.Should().Be(201);
        created.Value.Should().BeEquivalentTo(dto);
    }
}`;

codeExample7 = `tests/
├── MyApp.Domain.Tests/           ← Unit tests del Domain (sin mocks)
│   ├── Entities/
│   │   └── ProductTests.cs
│   ├── ValueObjects/
│   │   └── MoneyTests.cs
│   └── MyApp.Domain.Tests.csproj
│
├── MyApp.Application.Tests/      ← Unit tests con Moq
│   ├── Services/
│   │   └── ProductServiceTests.cs
│   ├── Validators/
│   │   └── CreateProductValidatorTests.cs
│   ├── Common/
│   │   └── Builders/
│   │       └── ProductBuilder.cs
│   └── MyApp.Application.Tests.csproj
│
└── MyApp.Api.Tests/               ← Controller unit tests
    ├── Controllers/
    │   └── ProductsControllerTests.cs
    └── MyApp.Api.Tests.csproj

# .csproj mínimo para tests
<PackageReference Include="xunit" Version="2.9.*" />
<PackageReference Include="xunit.runner.visualstudio" Version="2.8.*" />
<PackageReference Include="Moq" Version="4.20.*" />
<PackageReference Include="FluentAssertions" Version="6.12.*" />
<PackageReference Include="coverlet.collector" Version="6.0.*" />`;

}
