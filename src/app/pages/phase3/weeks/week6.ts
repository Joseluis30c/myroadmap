import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week6',
  imports: [RouterLink],
  templateUrl: './week6.html',
})
export class Week6 {
  codeExample1 = `RabbitMqPublisher.cs — Publicar mensajes

// NuGet: RabbitMQ.Client
public class RabbitMqPublisher : IMessagePublisher, IDisposable
{
    private readonly IConnection _connection;
    private readonly IChannel _channel;
    private const string ExchangeName = "orders.exchange";

    public RabbitMqPublisher(IConfiguration config)
    {
        var factory = new ConnectionFactory
        {
            HostName = config["RabbitMQ:Host"] ?? "localhost",
            UserName = config["RabbitMQ:User"] ?? "guest",
            Password = config["RabbitMQ:Password"] ?? "guest",
            DispatchConsumersAsync = true
        };
        _connection = factory.CreateConnectionAsync().GetAwaiter().GetResult();
        _channel    = _connection.CreateChannelAsync().GetAwaiter().GetResult();

        // Declarar el exchange (idempotente — no falla si ya existe)
        _channel.ExchangeDeclareAsync(
            exchange: ExchangeName,
            type:     ExchangeType.Topic,
            durable:  true).GetAwaiter().GetResult();
    }

    public async Task PublishAsync<T>(T message, string routingKey,
        CancellationToken ct = default)
    {
        var body = JsonSerializer.SerializeToUtf8Bytes(message);

        var props = new BasicProperties
        {
            Persistent   = true,          // sobrevive reinicios de RabbitMQ
            ContentType  = "application/json",
            MessageId    = Guid.NewGuid().ToString(),
            Timestamp    = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds())
        };

        await _channel.BasicPublishAsync(
            exchange:   ExchangeName,
            routingKey: routingKey,  // ej: "orders.new", "orders.cancelled"
            body:       body,
            basicProperties: props,
            mandatory:  false,
            cancellationToken: ct);
    }

    public void Dispose() { _channel?.Dispose(); _connection?.Dispose(); }
}`;

  codeExample2 = `OrderProcessorConsumer.cs — Consumir con BackgroundService

public class OrderProcessorConsumer : BackgroundService
{
    private const string QueueName = "orders.process";
    private const string DlqName   = "orders.process.dlq";

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Declarar la cola con Dead Letter Exchange configurado
        var args = new Dictionary<string, object>
        {
            ["x-dead-letter-exchange"] = "orders.dlx",     // destino si falla
            ["x-message-ttl"]         = 86400000,           // 24h TTL en ms
        };
        await _channel.QueueDeclareAsync(
            queue:      QueueName,
            durable:    true,
            exclusive:  false,
            autoDelete: false,
            arguments:  args);

        // Vincular queue al exchange con routing key pattern
        await _channel.QueueBindAsync(
            queue:      QueueName,
            exchange:   "orders.exchange",
            routingKey: "orders.*");       // acepta orders.new y orders.updated

        // Prefetch: solo tomar 1 mensaje a la vez (fair dispatch)
        await _channel.BasicQosAsync(prefetchCount: 1, global: false);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += async (_, ea) =>
        {
            try
            {
                var order = JsonSerializer.Deserialize<OrderCreatedMessage>(ea.Body.Span);
                await _orderService.ProcessAsync(order!, stoppingToken);

                // ACK: mensaje procesado correctamente, sacarlo de la cola
                await _channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed processing order message {MessageId}",
                    ea.BasicProperties.MessageId);

                // NACK con requeue:false → va al Dead Letter Queue
                // requeue:true → vuelve a la cola (cuidado con loops infinitos)
                await _channel.BasicNackAsync(ea.DeliveryTag,
                    multiple: false, requeue: false);
            }
        };

        await _channel.BasicConsumeAsync(
            queue: QueueName, autoAck: false, consumer: consumer);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }
}`;

  codeExample3 = `ServiceBusPublisher.cs + Consumer

// NuGet: Azure.Messaging.ServiceBus

// Program.cs
builder.Services.AddSingleton(sp =>
    new ServiceBusClient(
        $"{config["ServiceBus:Namespace"]}.servicebus.windows.net",
        new DefaultAzureCredential()));   // Managed Identity en Azure, az login en local

// ── Publisher ────────────────────────────────────────────────────
public class ServiceBusPublisher(ServiceBusClient client) : IMessagePublisher
{
    public async Task PublishAsync<T>(T message, string queueName,
        CancellationToken ct = default)
    {
        await using var sender = client.CreateSender(queueName);

        var sbMessage = new ServiceBusMessage(
            BinaryData.FromObjectAsJson(message))
        {
            MessageId        = Guid.NewGuid().ToString(),
            ContentType      = "application/json",
            Subject          = typeof(T).Name,       // para filtrar en subscriptions
            ScheduledEnqueueTime = DateTimeOffset.UtcNow  // envío inmediato
        };

        await sender.SendMessageAsync(sbMessage, ct);
    }
}

// ── Consumer (BackgroundService) ─────────────────────────────────
public class OrdersConsumer(ServiceBusClient client, ILogger<OrdersConsumer> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var processor = client.CreateProcessor("orders-queue",
            new ServiceBusProcessorOptions
            {
                MaxConcurrentCalls  = 4,     // procesar 4 mensajes en paralelo
                AutoCompleteMessages = false  // siempre completar/abandonar manualmente
            });

        processor.ProcessMessageAsync += async args =>
        {
            var order = args.Message.Body.ToObjectFromJson<OrderCreatedMessage>();
            await _orderService.ProcessAsync(order, args.CancellationToken);

            // Completar: eliminar de la cola
            await args.CompleteMessageAsync(args.Message, stoppingToken);
        };

        processor.ProcessErrorAsync += args =>
        {
            logger.LogError(args.Exception,
                "Service Bus error on {EntityPath}", args.EntityPath);
            // SDK reintenta automáticamente hasta MaxDeliveryCount
            // Después va al Dead Letter Queue
            return Task.CompletedTask;
        };

        await processor.StartProcessingAsync(stoppingToken);
        await Task.Delay(Timeout.Infinite, stoppingToken);
        await processor.StopProcessingAsync();
    }
}`;

  codeExample4 = `Program.cs — MassTransit configurable por entorno

// NuGet: MassTransit
//        MassTransit.RabbitMQ              (para dev local)
//        MassTransit.Azure.ServiceBus.Core (para Azure)

builder.Services.AddMassTransit(x =>
{
    // Registrar todos los consumers del assembly automáticamente
    x.AddConsumers(typeof(Program).Assembly);

    // Outbox Pattern con EF Core — consistencia transaccional
    x.AddEntityFrameworkOutbox<AppDbContext>(o =>
    {
        o.UseSqlServer();
        o.QueryDelay = TimeSpan.FromSeconds(1);
    });

    // Elegir broker según entorno
    var useAzure = builder.Configuration.GetValue<bool>("UseAzureServiceBus");

    if (useAzure)
    {
        x.UsingAzureServiceBus((ctx, cfg) =>
        {
            cfg.Host($"{config["ServiceBus:Namespace"]}.servicebus.windows.net",
                h => h.TokenCredential(new DefaultAzureCredential()));
            cfg.ConfigureEndpoints(ctx);
        });
    }
    else
    {
        x.UsingRabbitMq((ctx, cfg) =>
        {
            cfg.Host(builder.Configuration["RabbitMQ:Host"] ?? "localhost");
            cfg.ConfigureEndpoints(ctx);
        });
    }
});`;

  codeExample5 = `OrderCreatedConsumer.cs — Consumer tipado con retry

// Message contract (compartido entre producer y consumer)
public record OrderCreated(Guid OrderId, string CustomerId, decimal Total);

// Consumer: MassTransit lo registra automáticamente
public class OrderCreatedConsumer : IConsumer<OrderCreated>
{
    public async Task Consume(ConsumeContext<OrderCreated> context)
    {
        var order = context.Message;

        // Hacer el trabajo real
        await _emailService.SendConfirmationAsync(order.CustomerId, order.OrderId);

        // Si lanza excepción → MassTransit reintenta automáticamente
        // Después de los reintentos → va al Dead Letter Queue
    }
}

// Retry policy (en Program.cs)
cfg.UseMessageRetry(r => r
    .Exponential(
        retryLimit:   5,
        minInterval:  TimeSpan.FromSeconds(1),
        maxInterval:  TimeSpan.FromSeconds(30),
        intervalDelta:TimeSpan.FromSeconds(2)));

// Publicar desde el endpoint (el Outbox garantiza consistencia con la BD)
public async Task<IActionResult> CreateOrder(CreateOrderRequest req,
    IBus bus, AppDbContext db, CancellationToken ct)
{
    var order = new Order(req);
    db.Orders.Add(order);

    // Outbox: el mensaje se guarda en la misma transacción que el Order
    await bus.Publish(new OrderCreated(order.Id, order.CustomerId, order.Total), ct);
    await db.SaveChangesAsync(ct);   // Order + OutboxMessage en una transacción

    return Accepted(new { order.Id });  // 202 inmediato, procesamiento en background
}`;

  codeExample6 = `OrderCreatedConsumerTests.cs — Tests sin RabbitMQ

// NuGet: MassTransit.Testing
public class OrderCreatedConsumerTests : IAsyncLifetime
{
    private ITestHarness _harness = null!;

    public async Task InitializeAsync()
    {
        var services = new ServiceCollection();
        services.AddMassTransitTestHarness(x =>
            x.AddConsumer<OrderCreatedConsumer>());

        // Mock de los servicios que usa el consumer
        services.AddTransient<IEmailService>(_ =>
            Substitute.For<IEmailService>());

        var provider = services.BuildServiceProvider();
        _harness = provider.GetRequiredService<ITestHarness>();
        await _harness.Start();
    }

    [Fact]
    public async Task Consume_OrderCreated_SendsEmail()
    {
        // Arrange: publicar mensaje al harness (sin RabbitMQ real)
        await _harness.Bus.Publish(new OrderCreated(
            Guid.NewGuid(), "customer-42", 99.99m));

        // Assert: verificar que el consumer procesó el mensaje
        Assert.True(await _harness.Consumed.Any<OrderCreated>());

        var consumerHarness = _harness
            .GetConsumerHarness<OrderCreatedConsumer>();
        Assert.True(await consumerHarness.Consumed.Any<OrderCreated>());
    }

    public async Task DisposeAsync() => await _harness.Stop();
}`;

  codeExample7 = `docker-compose.yml — Agregar RabbitMQ al compose de Sem 13

# Agregar al docker-compose.yml de la Semana 13
services:

  rabbitmq:
    image:     rabbitmq:3-management-alpine
    ports:
      - "5672:5672"    # AMQP
      - "15672:15672"  # Management UI → localhost:15672
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test:      ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 15s
      retries:  5

  api:
    # ... resto igual, agregar dependencia
    depends_on:
      rabbitmq:
        condition: service_healthy
    environment:
      RabbitMQ__Host:     rabbitmq  # nombre del servicio en la red de Compose
      UseAzureServiceBus: false

volumes:
  rabbitmq_data:`;
}
