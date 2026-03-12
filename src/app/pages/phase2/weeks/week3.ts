import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week3',
  imports: [RouterLink],
  templateUrl: './week3.html',
})
export class Week3 {
  codeExample1 = `--transactions_correct.sql
-- ─── T-SQL: patrón correcto con XACT_STATE() ───
SET XACT_ABORT ON;  -- rollback automático ante cualquier error
BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE Accounts SET Balance = Balance - 100 WHERE Id = 1;
    UPDATE Accounts SET Balance = Balance + 100 WHERE Id = 2;

    -- Validar lógica de negocio
    IF EXISTS (SELECT 1 FROM Accounts WHERE Id = 1 AND Balance < 0)
        THROW 50001, 'Fondos insuficientes', 1;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    -- XACT_STATE(): 1=rollbackable, -1=uncommittable, 0=no transaction
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;  -- re-lanzar el error original
END CATCH
GO

-- Verificar transacciones anidadas con @@TRANCOUNT
-- @@TRANCOUNT > 0 significa que hay una transacción activa
SELECT @@TRANCOUNT; -- debe ser 0 fuera de transacciones`;

  codeExample2 = `//TransactionService.cs
// ─── C# + EF Core: patrón correcto ───
public async Task TransferAsync(int fromId, int toId, decimal amount,
    CancellationToken ct)
{
    // Estrategia de ejecución con retry automático
    var strategy = _ctx.Database.CreateExecutionStrategy();

    await strategy.ExecuteAsync(async () =>
    {
        await using var tx = await _ctx.Database.BeginTransactionAsync(ct);
        try
        {
            var from = await _ctx.Accounts
                .FirstOrDefaultAsync(a => a.Id == fromId, ct)
                ?? throw new NotFoundException(fromId);

            if (from.Balance < amount)
                throw new InsufficientFundsException();

            from.Balance   -= amount;
            var to          = await _ctx.Accounts.FindAsync(toId, ct);
            to!.Balance    += amount;

            await _ctx.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);   // ← único commit
        }
        catch
        {
            await tx.RollbackAsync(ct); // ← siempre en catch
            throw;
        }
    });
}`;

  codeExample3 = `-- ─── Habilitar READ COMMITTED SNAPSHOT (RCSI) ───
-- Ejecutar en master, no en la BD destino
ALTER DATABASE TuBaseDeDatos
    SET READ_COMMITTED_SNAPSHOT ON;
-- Ahora READ COMMITTED usa versiones de fila → sin lock en lecturas

-- Verificar que está activado
SELECT name, is_read_committed_snapshot_on
FROM   sys.databases
WHERE  name = 'TuBaseDeDatos';

-- ─── Demo: Dirty Read ───
-- SESIÓN 1 (NO commita):
BEGIN TRAN;
UPDATE Products SET Price = 9999 WHERE Id = 1;
-- NO hagas COMMIT aún

-- SESIÓN 2 (lee el dato sin commit → dirty read):
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT Price FROM Products WHERE Id = 1;  -- ve 9999 (no committed!)

-- SESIÓN 1 hace ROLLBACK:
ROLLBACK;
-- El 9999 que leyó sesión 2 NUNCA existió realmente

-- ─── Demo: Non-Repeatable Read ───
-- SESIÓN 1:
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN TRAN;
SELECT Price FROM Products WHERE Id = 1;  -- lee 100

-- SESIÓN 2 (entre las dos lecturas de sesión 1):
UPDATE Products SET Price = 200 WHERE Id = 1;
COMMIT;

-- SESIÓN 1 (segunda lectura, misma transacción):
SELECT Price FROM Products WHERE Id = 1;  -- ahora lee 200 ← diferente!
COMMIT;

-- Con SNAPSHOT: sesión 1 vería 100 en ambas lecturas

-- ─── Verificar nivel activo ───
SELECT
    session_id,
    CASE transaction_isolation_level
        WHEN 0 THEN 'Unspecified'
        WHEN 1 THEN 'Read Uncommitted'
        WHEN 2 THEN 'Read Committed'
        WHEN 3 THEN 'Repeatable Read'
        WHEN 4 THEN 'Serializable'
        WHEN 5 THEN 'Snapshot'
    END AS IsolationLevel
FROM sys.dm_exec_sessions
WHERE session_id = @@SPID;`;

  codeExample4 = `-- 1. Ver todas las sesiones bloqueadas y quién las bloquea
SELECT
    r.session_id                            AS waiting_spid,
    r.blocking_session_id                   AS blocking_spid,
    r.wait_type,
    r.wait_time / 1000                       AS wait_seconds,
    SUBSTRING(st.text, 1, 200)              AS waiting_query,
    SUBSTRING(st2.text, 1, 200)             AS blocking_query
FROM       sys.dm_exec_requests       r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) st
LEFT JOIN  sys.dm_exec_requests       r2 ON r.blocking_session_id = r2.session_id
OUTER APPLY sys.dm_exec_sql_text(r2.sql_handle) st2
WHERE      r.blocking_session_id > 0
ORDER BY   r.wait_time DESC;

-- 2. Ver todos los locks activos en la BD
SELECT
    l.resource_type,
    l.resource_description,
    l.request_mode   AS lock_mode,
    l.request_status,
    l.request_session_id AS spid,
    OBJECT_NAME(p.object_id) AS table_name
FROM      sys.dm_tran_locks l
LEFT JOIN sys.partitions   p ON l.resource_associated_entity_id = p.hobt_id
WHERE     l.resource_database_id = DB_ID()
ORDER BY  l.request_session_id;

-- 3. Configurar lock timeout (no bloquear indefinidamente)
SET LOCK_TIMEOUT 5000; -- 5 segundos máximo de espera
-- Lanzará error 1222 si supera el timeout
-- Manejar en C# con SqlException.Number == 1222

-- 4. Optimistic locking: sin locks de lectura (para apps de alta concurrencia)
-- En la tabla: agregar columna rowversion
ALTER TABLE Orders ADD RowVersion ROWVERSION NOT NULL;
-- EF Core: configura con .IsRowVersion() en el modelo
-- Si la fila cambió entre la lectura y el update → DbUpdateConcurrencyException`;

  codeExample5 = `-- ─── Reproducir deadlock clásico (ejecutar en paralelo) ───
-- SESIÓN 1:
BEGIN TRAN;
UPDATE Orders     SET Status = 'X' WHERE Id = 1;  -- X lock en Orders
WAITFOR DELAY '00:00:05';
UPDATE Inventory  SET Qty    = 0   WHERE Id = 1;  -- quiere X en Inventory
COMMIT;

-- SESIÓN 2 (en paralelo, dentro de los 5 segundos):
BEGIN TRAN;
UPDATE Inventory  SET Qty    = 0   WHERE Id = 1;  -- X lock en Inventory
WAITFOR DELAY '00:00:02';
UPDATE Orders     SET Status = 'Y' WHERE Id = 1;  -- quiere X en Orders → DEADLOCK
COMMIT;

-- ─── Extended Events: capturar deadlock graph ───
CREATE EVENT SESSION CaptureDeadlocks ON SERVER
ADD EVENT sqlserver.xml_deadlock_report
ADD TARGET package0.ring_buffer;
ALTER EVENT SESSION CaptureDeadlocks ON SERVER STATE = START;
-- En SSMS: Management > Extended Events > Sessions > CaptureDeadlocks
-- Click en "Watch Live Data" → verás el deadlock graph visualmente

-- ─── Solución 1: Orden consistente de acceso ───
-- SIEMPRE actualizar Orders ANTES que Inventory, en ambas sesiones
-- Elimina el ciclo de dependencia

-- ─── Solución 2: SNAPSHOT isolation elimina deadlocks de lectura ───
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;
BEGIN TRAN;
-- Las lecturas no adquieren S locks → no pueden ser parte de un deadlock
COMMIT;`;

  codeExample6 = `// ─── Retry con Polly para deadlocks y errores transitorios ───
using Polly;
using Microsoft.Data.SqlClient;

// SqlException.Number 1205 = deadlock victim
// SqlException.Number 1222 = lock timeout
var retryPolicy = Policy
    .Handle<SqlException>(ex =>
        ex.Number == 1205 || ex.Number == 1222)
    .Or<DbUpdateConcurrencyException>()  // optimistic concurrency
    .WaitAndRetryAsync(
        retryCount: 3,
        sleepDurationProvider: attempt =>
            TimeSpan.FromMilliseconds(200 * Math.Pow(2, attempt)
                + Random.Shared.Next(0, 100)),  // jitter
        onRetry: (ex, delay, attempt, _) =>
            _logger.LogWarning(
                "Deadlock retry {Attempt}, delay {Delay}ms",
                attempt, delay.TotalMilliseconds));

// Usar en el servicio:
await retryPolicy.ExecuteAsync(async () =>
    await _orderService.ProcessOrderAsync(orderId, ct));

// EF Core: CreateExecutionStrategy hace retry automático
// para errores transitorios si usas SQL Server provider
var strategy = _context.Database.CreateExecutionStrategy();
await strategy.ExecuteAsync(async () => {
    // tu transacción aquí
});`;

  codeExample7 = `-- T=0: Stock = 100
-- SESIÓN A: lee stock = 100
SELECT Stock FROM Products WHERE Id = 1;

-- SESIÓN B: también lee stock = 100 (antes que A guarde)
SELECT Stock FROM Products WHERE Id = 1;

-- SESIÓN A: guarda 100 - 10 = 90
UPDATE Products SET Stock = 90 WHERE Id = 1;
COMMIT;

-- SESIÓN B: guarda 100 - 10 = 90 (sobrescribe a A!)
UPDATE Products SET Stock = 90 WHERE Id = 1;
COMMIT;
-- Resultado: 90. Correcto: 80. Vendimos 10 que no existían.`;

  codeExample8 = `-- SESIÓN A: lee con UPDLOCK → B debe esperar
BEGIN TRAN;
SELECT Stock FROM Products WITH (UPDLOCK, ROWLOCK)
WHERE Id = 1;

-- SESIÓN B intenta leer: ESPERA hasta que A haga COMMIT

-- SESIÓN A actualiza y libera
UPDATE Products SET Stock = Stock - 10
WHERE  Id = 1 AND Stock >= 10;
COMMIT; -- ahora B puede leer: Stock = 90
-- B hace su propio cálculo: 90 - 10 = 80 ✓`;

  codeExample9 = `-- ─── ESCENARIO 1: Pessimistic Locking con UPDLOCK ───
BEGIN TRAN;
DECLARE @stock INT;

-- Leer con U lock: impide que otros lean para actualizar
SELECT @stock = Stock
FROM  Products WITH (UPDLOCK, ROWLOCK)
WHERE Id = 1;

IF @stock >= 10
BEGIN
    UPDATE Products SET Stock = Stock - 10 WHERE Id = 1;
    COMMIT;
END
ELSE
BEGIN
    ROLLBACK;
    THROW 50002, 'Stock insuficiente', 1;
END

-- ─── ESCENARIO 2: Optimistic con ROWVERSION ───
-- En la tabla: RowVersion ROWVERSION NOT NULL
BEGIN TRAN;
DECLARE @rv ROWVERSION, @st INT;

SELECT @rv = RowVersion, @st = Stock
FROM  Products WHERE Id = 1;

-- ... lógica de negocio ...

-- Solo actualiza si nadie modificó la fila desde la lectura
UPDATE Products
SET    Stock = @st - 10
WHERE  Id = 1 AND RowVersion = @rv;  -- condición de concurrencia

IF @@ROWCOUNT = 0
BEGIN
    ROLLBACK;
    THROW 50003, 'Conflicto de concurrencia — reintentar', 1;
END
COMMIT;`;

  codeExample10 = `// ─── EF Core: Optimistic concurrency con RowVersion ───
// 1. Configurar en el modelo:
public class Product
{
    public int   Id      { get; set; }
    public int   Stock   { get; set; }
    [Timestamp]  // o en Fluent API: .IsRowVersion()
    public byte[] RowVersion { get; set; }
}

// 2. Manejar el conflicto:
try
{
    product.Stock -= quantity;
    await _ctx.SaveChangesAsync(ct);
}
catch (DbUpdateConcurrencyException ex)
{
    // La fila fue modificada por otra sesión
    var entry = ex.Entries.Single();

    // Opción A: DatabaseWins — descartar cambios del cliente
    await entry.ReloadAsync(ct);

    // Opción B: ClientWins — sobrescribir con valor del cliente
    entry.OriginalValues.SetValues(
        await entry.GetDatabaseValuesAsync(ct));
    await _ctx.SaveChangesAsync(ct);

    // Opción C: MergeWins — combinar cambios (tu lógica)
    // throw para que el caller decida / haga retry
    throw;
}`;
  
}
