import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { sign } from 'node:crypto';

interface Flashcard {
  q: string;
  a: string;
}

type Category = 'backend' | 'sql' | 'design' | 'behavioral';
@Component({
  selector: 'app-week3',
  imports: [RouterLink],
  templateUrl: './week3.html',
})

export class Week3 {

    //flashcard
    readonly categories: {key: Category; label: string }[] = [
        { key: 'backend', label: 'Backend'},
        { key: 'sql', label: 'SQL'},
        { key: 'design', label: 'Design'},
        { key: 'behavioral', label: 'Soft'},
    ];

    readonly cards: Record<Category, Flashcard[]> = {
        backend: [
            {
                q: 'Explain the Single Responsibility Principle with a C# example',
                a: '<strong>SRP:</strong> A class should have only one reason to change. Example: <code>OrderValidator</code> only validates, <code>OrderRepository</code> only persists. If you have a service that validates, saves, and sends emails — it has three reasons to change, violating SRP.<br><br>The test: if you can describe what a class does and the description includes the word "and", it probably violates SRP.'
            },
            {
                q: "What's the difference between IEnumerable, ICollection, and IList?",
                a: '<strong>IEnumerable&lt;T&gt;:</strong> forward-only iteration, no Count, no Add/Remove. Lazily evaluated — best for LINQ chains.<br><br><strong>ICollection&lt;T&gt;:</strong> adds Count and Add/Remove. Still no index access.<br><br><strong>IList&lt;T&gt;:</strong> adds index access (list[i]) and IndexOf.<br><br><strong>Rule:</strong> accept the most generic interface in method params — accept IEnumerable if you only iterate, IList only if you need indexes.'
            },
            {
                q: 'How does Dependency Injection improve testability?',
                a: 'DI makes dependencies explicit and swappable. Instead of <code>new SqlOrderRepository()</code> inside a service, you declare <code>IOrderRepository</code> in the constructor — the runtime injects the real implementation in production, and your test injects a mock.<br><br>Result: you can test <code>OrderService</code> logic without a real database. With <code>Moq</code>: <code>var mock = new Mock&lt;IOrderRepository&gt;(); mock.Setup(r => r.GetAsync(1)).ReturnsAsync(fakeOrder);</code>'
            },
            {
                q: 'What is the Outbox Pattern and when do you need it?',
                a: 'The Outbox Pattern solves the dual-write problem: if you save to DB and then publish an event to a queue, there\'s a window where the DB succeeds but the publish fails — inconsistency.<br><br><strong>Solution:</strong> In the same DB transaction, write the event to an <code>OutboxMessages</code> table. A background job reads and publishes it, marking it as processed.<br><br><strong>When you need it:</strong> any time you need to guarantee that a domain event gets published exactly once after a state change.'
            },
            {
                q: 'Explain async/await — what really happens on the thread pool?',
                a: '<code>await</code> doesn\'t block a thread — it releases it back to the thread pool while waiting for I/O. When the I/O completes, a thread picks up execution from the continuation.<br><br><strong>Key points:</strong> <code>async void</code> is dangerous (exceptions are swallowed). <code>.Result</code> and <code>.Wait()</code> can cause deadlocks. In ASP.NET Core, <code>ConfigureAwait(false)</code> is less critical than in classic, but still good practice in library code.'
            },
            {
                q: "What's the difference between REST and gRPC?",
                a: '<strong>REST:</strong> HTTP/1.1, JSON, human-readable, stateless, excellent for public APIs and browser clients.<br><br><strong>gRPC:</strong> HTTP/2, Protocol Buffers (binary), strongly-typed contract via .proto files, streaming support, ~10x faster for internal service communication.<br><br><strong>When gRPC:</strong> internal microservice-to-microservice calls. <strong>When REST:</strong> public APIs, mobile clients, or browser consumers.'
            },
            {
                q: 'How does the middleware pipeline work in ASP.NET Core?',
                a: 'Middleware is a chain of components that process requests and responses. Each piece can: short-circuit or call <code>next()</code> to pass to the next component.<br><br>Order matters: <code>UseExceptionHandler</code> first, <code>UseAuthentication</code> before <code>UseAuthorization</code>, <code>UseRouting</code> before <code>UseEndpoints</code>.<br><br>Custom middleware: implement <code>IMiddleware</code> or use the convention-based pattern with <code>InvokeAsync(HttpContext ctx, RequestDelegate next)</code>.'
            },
            {
                q: "What's the difference between Value Objects and Entities in DDD?",
                a: '<strong>Entity:</strong> has identity (Id). Two entities with the same data but different Ids are different objects.<br><br><strong>Value Object:</strong> defined by its data, no identity. Two <code>Email</code> objects with the same value are equal. Should be immutable. Examples: <code>Email</code>, <code>Money</code>, <code>Address</code>.<br><br>In C#: Value Objects fit naturally as <code>records</code> (structural equality by default).'
            }
        ],
        sql: [
            {
                q: "What's the difference between ROW_NUMBER(), RANK(), and DENSE_RANK()?",
                a: '<strong>ROW_NUMBER():</strong> unique number regardless of ties — 1,2,3,4.<br><strong>RANK():</strong> ties get the same rank, next rank skips — 1,2,2,4.<br><strong>DENSE_RANK():</strong> ties get the same rank, no gaps — 1,2,2,3.<br><br><strong>Classic problem:</strong> "Find the 2nd highest salary per department" → <code>DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC)</code> WHERE rank = 2.'
            },
            {
                q: 'A query takes 8 seconds. Walk me through your diagnostic process.',
                a: '<strong>1. Execution Plan:</strong> Table Scans, Key Lookups, thick arrows (too many rows).<br><strong>2. Indexes:</strong> are WHERE, JOIN, ORDER BY columns indexed? Consider covering index with INCLUDE().<br><strong>3. SARGability:</strong> <code>WHERE YEAR(date) = 2024</code> breaks index usage. Rewrite as <code>BETWEEN</code>.<br><strong>4. Statistics:</strong> <code>UPDATE STATISTICS [table]</code> — stale stats cause bad plans.<br><strong>5. Blocking:</strong> check <code>sys.dm_exec_requests</code> for blocking chains.'
            },
            {
                q: 'Explain ACID and the SQL Server isolation levels',
                a: '<strong>ACID:</strong> Atomicity, Consistency, Isolation, Durability.<br><br><strong>Isolation levels:</strong><br>READ UNCOMMITTED: dirty reads possible — avoid<br>READ COMMITTED (default): prevents dirty reads<br>REPEATABLE READ: prevents dirty + non-repeatable reads<br>SERIALIZABLE: prevents all anomalies, most locking<br>SNAPSHOT: readers don\'t block writers — SQL Server\'s best balance for high-concurrency reads.'
            },
            {
                q: 'What is a covering index and when do you create one?',
                a: 'A covering index includes all columns needed to satisfy a query without a Key Lookup.<br><br><code>CREATE INDEX IX_Orders_Customer ON Orders (CustomerId) INCLUDE (Amount, Status, OrderDate);</code><br><br><strong>When to create:</strong> when the Execution Plan shows an expensive Key Lookup on a frequently-run query. Check <code>sys.dm_db_missing_index_details</code> for SQL Server recommendations.'
            },
            {
                q: 'How do you detect and resolve a deadlock in SQL Server?',
                a: '<strong>Detection:</strong> SQL Server kills one transaction with error 1205. Enable Trace Flag 1222 or Extended Events to capture deadlock graphs.<br><br><strong>Root causes:</strong> two transactions acquiring locks in opposite order.<br><br><strong>Solutions:</strong> (1) Access tables in the same order. (2) Keep transactions short. (3) <code>NOLOCK</code> hint for read-only queries (with caution). (4) SNAPSHOT isolation to eliminate read-write deadlocks.'
            }
        ],
        design: [
            {
                q: 'Design a Rate Limiter — walk me through your approach',
                a: '<strong>Token Bucket (recommended):</strong> each user has a bucket with N tokens. Each request consumes 1 token. Tokens refill at a constant rate. Allows bursts up to bucket capacity.<br><br><strong>Implementation:</strong> Redis key with TTL. Key: <code>rate_limit:{userId}:{window}</code>. Use Redis INCR + EXPIRE. Return 429 with <code>Retry-After</code> header.<br><br><strong>In .NET:</strong> built-in <code>AddRateLimiter</code> with <code>TokenBucketRateLimiterOptions</code>. Redis cluster for distributed rate limiting.'
            },
            {
                q: 'Design a Notification System for 10M users',
                a: '<strong>High-level:</strong> Notification Service → message queue (Azure Service Bus / RabbitMQ) by channel → Email Worker, Push Worker, SMS Worker.<br><br><strong>Key decisions:</strong> (1) Async delivery via queue. (2) Priority queue for critical notifications. (3) User preference service to filter. (4) Retry with exponential backoff. (5) Idempotency key to prevent duplicates.<br><br><strong>Scale bottleneck:</strong> delivery workers — scale horizontally.'
            },
            {
                q: 'Design a URL Shortener (like bit.ly)',
                a: '<strong>Short code:</strong> Base62 encoding (a-z, A-Z, 0-9) of an auto-increment ID.<br><br><strong>Data model:</strong> <code>urls(id, short_code, long_url, created_at, expires_at, hit_count)</code>. Index on short_code.<br><br><strong>Redirect:</strong> HTTP 301 (cached by browser, less DB hits) vs 302 (more control, analytics). 302 if you need click counting.<br><br><strong>Scale:</strong> Redis cache mapping short_code → long_url with TTL.'
            },
            {
                q: 'How would you design the architecture for the system you built in your roadmap?',
                a: '<strong>Services:</strong> API Gateway (YARP) → Orders API, Catalog API<br><strong>Communication:</strong> sync REST via YARP, async events via Azure Service Bus with MassTransit<br><strong>Data:</strong> separate DB per service<br><strong>Cache:</strong> Redis Cache-Aside on read endpoints<br><strong>Auth:</strong> OAuth 2.0 / JWT at the gateway<br><strong>Observability:</strong> Serilog → App Insights, Correlation IDs<br><strong>Deploy:</strong> Azure Container Apps via GitHub Actions CI/CD<br><br>Mention 2–3 decisions and their trade-offs.'
            }
        ],
        behavioral: [
            {
                q: "Tell me about a project you're most proud of",
                a: '<strong>STAR framework:</strong><br><br><strong>S:</strong> "Over the past 6 months I built a production-grade microservices platform on Azure."<br><strong>T:</strong> "Go from fundamentals to a deployable, observable, secure system."<br><strong>A:</strong> "6-service architecture with CQRS, event-driven communication via Service Bus, OAuth 2.0, Redis caching, full observability with App Insights and KQL."<br><strong>R:</strong> "P99 latency under 150ms, zero Critical security issues, full CI/CD deployment in under 8 minutes." Then link to GitHub.'
            },
            {
                q: 'Tell me about a time you failed or made a mistake',
                a: 'The interviewer wants: (1) you take ownership, (2) you identified the root cause, (3) you changed something as a result.<br><br><strong>Structure:</strong> S: context → T: your responsibility → A: what went wrong and what you did → R: what you learned and changed permanently.<br><br><strong>What NOT to do:</strong> blame others, say "I can\'t think of one" (red flag), or pick a trivial failure.<br><br><strong>What TO do:</strong> pick a real mistake with real consequences. Be specific about what you changed.'
            },
            {
                q: 'How do you handle working with unclear or changing requirements?',
                a: 'My approach: (1) Clarify upfront — ask 5 questions: who\'s the user, what\'s the success metric, what\'s out of scope, timeline, and biggest risk. (2) Build incrementally with the clearest requirements first. (3) When requirements change, assess impact, communicate the trade-off, and adjust without drama.<br><br><strong>Mention:</strong> ADRs — I document decisions so when requirements change, I know which assumptions to revisit.'
            },
            {
                q: 'Where do you want to be in 3 years?',
                a: '"In 3 years, I want to be the person on the team who is the reference for distributed systems architecture — someone other developers come to when they have hard design questions. I also want to start taking on technical leadership in projects.<br><br>I\'m particularly interested in [this company] because [specific reason] — I think the technical challenges here would accelerate exactly that trajectory."<br><br><strong>Key:</strong> connect your answer to something specific about the company. Generic answers signal you haven\'t researched the role.'
            }
        ]
    };
    //signal
    activeCategory = signal<Category>('backend');
    currentIndex = signal(0);
    answerVisible = signal(false);

    currentList = computed(()=> this.cards[this.activeCategory()]);
    currentCard = computed(()=> this.currentList()[this.currentIndex()]);
    counter = computed(()=> `${this.currentIndex() + 1} / ${this.currentList().length}`)
    //actions
    setCategory(cat: Category): void{
        this.activeCategory.set(cat);
        this.currentIndex.set(0);
        this.answerVisible.set(false);
    }
    showAnswer(): void{
        this.answerVisible.set(true);
    }
    nextCard(): void{
        this.currentIndex.update( i => (i +1) % this.currentList().length);
        this.answerVisible.set(false);
    }

    //Toggle QA
    toggleQA(event: Event){
        const element = event.currentTarget as HTMLDivElement;
        const qa = element.closest('.rn-qa');
        qa?.classList.toggle('open');
    }

    codeExample1 = `-- 1. Top N por grupo (clásico de entrevistas)
-- "Dame los 3 empleados con mayor salario por departamento"
WITH Ranked AS (
    SELECT EmployeeId, DepartmentId, Salary,
           DENSE_RANK() OVER (PARTITION BY DepartmentId ORDER BY Salary DESC) AS rnk
    FROM Employees
)
SELECT * FROM Ranked WHERE rnk <= 3;

-- 2. Running total / acumulado
-- "Muestra el total acumulado de ventas por fecha"
SELECT
    OrderDate,
    Amount,
    SUM(Amount) OVER (ORDER BY OrderDate
                       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS RunningTotal
FROM Orders;

-- 3. Detectar duplicados y quedarse con uno
-- "De una tabla con emails duplicados, quédate con el registro más reciente"
WITH Deduped AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY Email ORDER BY CreatedAt DESC) AS rn
    FROM Users
)
DELETE FROM Deduped WHERE rn > 1;  -- o SELECT * WHERE rn = 1`;

    codeExample2 = `// Dado: List<Order> orders con propiedades CustomerId, Amount, Date, Status

// 1. Top 3 clientes por total de ventas (GroupBy + Sum + OrderByDescending)
var top3 = orders
    .GroupBy(o => o.CustomerId)
    .Select(g => new { CustomerId = g.Key, Total = g.Sum(o => o.Amount) })
    .OrderByDescending(x => x.Total)
    .Take(3);

// 2. Pedidos del último mes agrupados por status (Where + GroupBy + Count)
var lastMonth = orders
    .Where(o => o.Date >= DateTime.UtcNow.AddMonths(-1))
    .GroupBy(o => o.Status)
    .ToDictionary(g => g.Key, g => g.Count());

// 3. Encontrar clientes que compraron en TODOS los meses del año (tricky)
var loyalCustomers = orders
    .Where(o => o.Date.Year == 2024)
    .GroupBy(o => o.CustomerId)
    .Where(g => g.Select(o => o.Date.Month).Distinct().Count() == 12)
    .Select(g => g.Key);

// 4. Running total (no es LINQ nativo, pero es un clásico de entrevista)
// Si lo piden: explicar que LINQ no tiene built-in running sum eficiente
// y proponer un Aggregate o un simple foreach explicando el trade-off
var runningTotals = orders
    .OrderBy(o => o.Date)
    .Aggregate(
        (total: 0m, list: new List<decimal>()),
        (acc, o) => {
            var newTotal = acc.total + o.Amount;
            acc.list.Add(newTotal);
            return (newTotal, acc.list);
        })
    .list;`;
}
