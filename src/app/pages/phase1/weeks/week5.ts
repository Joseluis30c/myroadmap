import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week5',
  imports: [RouterLink],
  templateUrl: './week5.html',
})
export class Week5 {

  codeExample1 = `// Infrastructure/Auth/JwtTokenService.cs
public class JwtTokenService(IOptions<JwtSettings> jwtSettings)
{
    private readonly JwtSettings _settings = jwtSettings.Value;

    public string GenerateAccessToken(User user)
    {
        var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()), // unique id
            new(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),
        };
        // Agregar todos los roles como claims separados
        claims.AddRange(user.Roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var token = new JwtSecurityToken(
            issuer:             _settings.Issuer,
            audience:           _settings.Audience,
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            DateTime.UtcNow.AddMinutes(15), // ← 15 min máximo
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

// appsettings.json — NUNCA el SecretKey aquí en producción
// Usar User Secrets en dev, Environment Variable en prod
"JwtSettings": {
  "Issuer": "MyApp",
  "Audience": "MyApp.Client",
  "SecretKey": "⚠️ Use User Secrets! Not here!"
}`;

codeExample2= `// Program.cs — configuración JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,   // ← siempre true
            ValidateAudience         = true,   // ← siempre true
            ValidateLifetime         = true,   // ← valida expiración
            ValidateIssuerSigningKey = true,   // ← valida la firma
            ValidIssuer      = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience    = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    builder.Configuration["JwtSettings:SecretKey"]!)),
            // Reducir clock skew para tokens de corta duración
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();

// Orden en el pipeline — IMPORTA
app.UseAuthentication();  // ← ANTES de Authorization
app.UseAuthorization();`;

codeExample3 = `// Program.cs — Definición de policies
builder.Services.AddAuthorization(opts =>
{
    // Policy basada en rol
    opts.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));

    // Policy basada en claim
    opts.AddPolicy("PremiumUser", p =>
        p.RequireClaim("subscription", "premium"));

    // Policy combinada
    opts.AddPolicy("ContentManager", p => p
        .RequireAuthenticatedUser()
        .RequireRole("Admin", "Editor")
        .RequireClaim("department", "content"));

    // Policy mínima de edad con Requirement custom
    opts.AddPolicy("AdultOnly", p =>
        p.Requirements.Add(new MinimumAgeRequirement(18)));
});

// Authorization Handler custom
public class MinimumAgeHandler : AuthorizationHandler<MinimumAgeRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext ctx,
        MinimumAgeRequirement req)
    {
        var dobClaim = ctx.User.FindFirst("date_of_birth");
        if (dobClaim != null &&
            DateTime.TryParse(dobClaim.Value, out var dob) &&
            dob.AddYears(req.MinimumAge) <= DateTime.Today)
            ctx.Succeed(req);

        return Task.CompletedTask;
    }
}

// Uso en controllers
[Authorize(Policy = "AdminOnly")]
[HttpDelete("{id}")]
public async Task<IActionResult> Delete(Guid id) { ... }

// Acceder a los claims en un endpoint
var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
var email  = User.FindFirstValue(ClaimTypes.Email);
var isAdmin = User.IsInRole("Admin");`;

codeExample4 = `// JavaScript — NUNCA así
localStorage.setItem(
  'refreshToken',
  token
);
// XSS puede leer localStorage
// y robar el token fácilmente`;

codeExample5 = `// API — cookie segura
Response.Cookies.Append(
  "refreshToken", token,
  new CookieOptions {
    HttpOnly = true,  // JS no puede leerla
    Secure   = true,  // solo HTTPS
    SameSite = SameSiteMode.Strict,
    Expires  = DateTime.UtcNow.AddDays(7)
  });`;

codeExample6 = `// Domain/Entities/RefreshToken.cs
public class RefreshToken : Entity
{
    public Guid     UserId    { get; private set; }
    public string   Token     { get; private set; }  // SHA256 hash
    public DateTime ExpiresAt { get; private set; }
    public DateTime? RevokedAt { get; private set; }
    public Guid?    ReplacedBy { get; private set; } // para detección de reúso

    public bool IsActive  => RevokedAt == null && DateTime.UtcNow < ExpiresAt;
    public bool IsRevoked => RevokedAt != null;
    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;

    public static RefreshToken Create(Guid userId)
    {
        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        return new RefreshToken {
            UserId    = userId,
            Token     = HashToken(rawToken),  // guardar solo el hash
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            RawToken  = rawToken  // solo para retornar al cliente
        };
    }

    private static string HashToken(string token) =>
        Convert.ToBase64String(
            SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public void Revoke(Guid? replacedById = null)
    {
        RevokedAt  = DateTime.UtcNow;
        ReplacedBy = replacedById;
    }
}

// Application/Auth/RefreshTokenService.cs — rotación con detección
public async Task<Result<TokenPair>> RefreshAsync(string rawToken)
{
    var hash    = RefreshToken.HashToken(rawToken);
    var rfToken = await _repo.GetByTokenHashAsync(hash);

    if (rfToken == null)
        return Result<TokenPair>.Failure(Error.Unauthorized("Invalid token"));

    if (rfToken.IsRevoked)
    {
        // ⚠️ Refresh Token ya revocado siendo usado = posible robo
        // Invalida TODOS los tokens del usuario (nuclear option)
        await _repo.RevokeAllForUserAsync(rfToken.UserId);
        return Result<TokenPair>.Failure(Error.Unauthorized("Token reuse detected"));
    }

    if (rfToken.IsExpired)
        return Result<TokenPair>.Failure(Error.Unauthorized("Token expired"));

    // Rotar: revocar el actual y generar uno nuevo
    var newToken = RefreshToken.Create(rfToken.UserId);
    rfToken.Revoke(replacedById: newToken.Id);
    await _repo.AddAsync(newToken);
    await _uow.SaveChangesAsync();

    var user        = await _userRepo.GetByIdAsync(rfToken.UserId);
    var accessToken = _jwtService.GenerateAccessToken(user!);

    return Result<TokenPair>.Success(new("Bearer", accessToken, newToken.RawToken));
}`;

codeExample7 = `// Rate Limiting — proteger el endpoint de login de brute force
builder.Services.AddRateLimiter(opts =>
{
    opts.AddFixedWindowLimiter("auth", o =>
    {
        o.PermitLimit         = 5;
        o.Window              = TimeSpan.FromMinutes(1);
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit          = 0;
    });

    opts.AddSlidingWindowLimiter("api", o =>
    {
        o.PermitLimit         = 100;
        o.Window              = TimeSpan.FromMinutes(1);
        o.SegmentsPerWindow   = 4;
    });

    opts.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// CORS — solo orígenes específicos
builder.Services.AddCors(opts =>
    opts.AddPolicy("AllowFrontend", p => p
        .WithOrigins("https://myapp.com", "https://www.myapp.com")
        .WithMethods("GET", "POST", "PUT", "DELETE")
        .WithHeaders(HeaderNames.Authorization, HeaderNames.ContentType)
        .AllowCredentials())); // necesario para cookies HttpOnly

// Pipeline order
app.UseRateLimiter();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// Aplicar rate limiting por endpoint
app.MapPost("/auth/login", handler)
   .RequireRateLimiting("auth");    // ← 5 intentos/min

app.MapControllers()
   .RequireRateLimiting("api");     // ← 100 req/min general`;

codeExample8 = `[ApiController]
[Route("api/v1/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var result = await authService.LoginAsync(req.Email, req.Password);
        if (!result.IsSuccess) return Problem(statusCode: 401, detail: "Invalid credentials");

        // Refresh token en cookie HttpOnly — nunca en el body
        Response.Cookies.Append("refreshToken", result.Value.RefreshToken,
            new CookieOptions { HttpOnly = true, Secure = true,
                SameSite = SameSiteMode.Strict, Expires = DateTimeOffset.UtcNow.AddDays(7) });

        return Ok(new { result.Value.AccessToken, result.Value.TokenType });
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh()
    {
        var rfToken = Request.Cookies["refreshToken"];
        if (rfToken is null) return Problem(statusCode: 401);

        var result = await authService.RefreshAsync(rfToken);
        if (!result.IsSuccess)
        {
            Response.Cookies.Delete("refreshToken");
            return Problem(statusCode: 401);
        }

        Response.Cookies.Append("refreshToken", result.Value.RefreshToken,
            new CookieOptions { HttpOnly = true, Secure = true,
                SameSite = SameSiteMode.Strict, Expires = DateTimeOffset.UtcNow.AddDays(7) });

        return Ok(new { result.Value.AccessToken });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var rfToken = Request.Cookies["refreshToken"];
        if (rfToken is not null)
            await authService.RevokeRefreshTokenAsync(rfToken);

        Response.Cookies.Delete("refreshToken");
        return NoContent();
    }
}`;


}
