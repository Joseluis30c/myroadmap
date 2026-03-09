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

  codeExample4 = ``;

  codeExample5 = ``;

  codeExample6 = ``;

  codeExample7 = ``;
  
}
