import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week4',
  imports: [RouterLink],
  templateUrl: './week4.html',
})
export class Week4 {
  codeExample1 = `-- ─── 1. TOP WAIT TYPES (lo primero que ejecutas) ───
SELECT TOP 10
    wait_type,
    waiting_tasks_count,
    wait_time_ms                                      AS total_wait_ms,
    wait_time_ms / NULLIF(waiting_tasks_count, 0)     AS avg_wait_ms,
    CAST(100.0 * wait_time_ms
        / SUM(wait_time_ms) OVER()
        AS DECIMAL(5,2))                              AS pct_of_total
FROM  sys.dm_os_wait_stats
WHERE wait_type NOT IN (  -- excluir waits benignos del sistema
    'SLEEP_TASK', 'BROKER_TO_FLUSH', 'BROKER_EVENTHANDLER',
    'REQUEST_FOR_DEADLOCK_SEARCH', 'LOGMGR_QUEUE',
    'CHECKPOINT_QUEUE', 'CLR_AUTO_EVENT', 'DISPATCHER_QUEUE_SEMAPHORE',
    'FT_IFTS_SCHEDULER_IDLE_WAIT', 'XE_DISPATCHER_WAIT')
ORDER BY wait_time_ms DESC;

-- ─── 2. TOP QUERIES por reads × executions (impacto total) ───
SELECT TOP 20
    total_logical_reads                                        AS total_reads,
    total_logical_reads / execution_count                      AS avg_reads,
    total_elapsed_time  / execution_count / 1000               AS avg_ms,
    execution_count,
    total_worker_time   / execution_count                      AS avg_cpu_µs,
    creation_time                                              AS plan_compiled,
    SUBSTRING(st.text, 1, 300)                                 AS query_text,
    qp.query_plan
FROM       sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle)  st
CROSS APPLY sys.dm_exec_query_plan(qs.plan_handle) qp
ORDER BY   total_logical_reads DESC;

-- ─── 3. MISSING INDEXES más impactantes ───
SELECT TOP 10
    migs.avg_total_user_cost * migs.avg_user_impact
        * (migs.user_seeks + migs.user_scans)  AS impact_score,
    DB_NAME(mid.database_id)                   AS db_name,
    mid.statement                              AS table_name,
    mid.equality_columns,
    mid.inequality_columns,
    mid.included_columns
FROM sys.dm_db_missing_index_group_stats migs
JOIN sys.dm_db_missing_index_groups     mig  ON mig.index_group_handle = migs.group_handle
JOIN sys.dm_db_missing_index_details    mid  ON mig.index_handle       = mid.index_handle
ORDER BY impact_score DESC;

-- ─── 4. SPs más costosos (para refactorizar) ───
SELECT TOP 10
    OBJECT_NAME(ps.object_id)                   AS sp_name,
    ps.total_logical_reads / ps.execution_count AS avg_reads,
    ps.total_elapsed_time  / ps.execution_count
        / 1000                                  AS avg_ms,
    ps.execution_count,
    ps.cached_time                              AS plan_compiled
FROM  sys.dm_exec_procedure_stats ps
WHERE ps.database_id = DB_ID()
ORDER BY avg_reads DESC;`;

  codeExample2 = `-- ════════════════════════════════════════
-- BASELINE — [Nombre del SP o Query]
-- Fecha: [FECHA]  Entorno: [DEV/QA/PROD]
-- ════════════════════════════════════════

-- Limpiar caché de planes (SOLO en dev/QA, nunca en prod)
-- DBCC FREEPROCCACHE;
-- DBCC DROPCLEANBUFFERS; -- también limpia buffer pool

SET STATISTICS IO   ON;
SET STATISTICS TIME ON;
SET NOCOUNT         ON;
-- Activar en SSMS: Query > Include Actual Execution Plan (Ctrl+M)

GO
-- ─── QUERY A MEDIR ───────────────────────────────
EXEC usp_GetOrdersByCustomer
    @CustomerId  = 42,
    @StartDate   = '2024-01-01',
    @PageSize    = 50;
GO
-- ─────────────────────────────────────────────────

SET STATISTICS IO   OFF;
SET STATISTICS TIME OFF;

/* ANOTAR EN EL DOCUMENTO:
   Table 'Orders'.   Scan count __, logical reads __, physical reads __
   Table 'Customers'.Scan count __, logical reads __, physical reads __
   SQL Server Execution Times:
      CPU time = __ ms,  elapsed time = __ ms.
   Plan: [guardar XML con clic derecho > Save Execution Plan As]
   Estimated rows vs Actual rows: verificar diferencia en el plan
   Operadores clave: [ej. Clustered Index Scan en Orders — 78% del costo]
*/

-- Capturar plan en texto (para guardar en el doc)
SELECT
    qs.execution_count,
    qs.total_logical_reads / qs.execution_count  AS avg_reads,
    qs.total_elapsed_time  / qs.execution_count
        / 1000                                   AS avg_ms,
    SUBSTRING(st.text, 1, 500)                   AS query_text
FROM       sys.dm_exec_procedure_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
WHERE      OBJECT_NAME(qs.object_id) = 'usp_GetOrdersByCustomer';`;

  codeExample3 = `-- ─── PATRÓN 1: Cursor → Set-based (acumulativo) ───
-- ❌ ANTES: cursor que suma fila por fila (~45 seg en 100k filas)
/*
DECLARE @Running DECIMAL(18,2) = 0;
DECLARE cur CURSOR FOR SELECT Total FROM Orders ORDER BY OrderDate;
OPEN cur; FETCH NEXT FROM cur INTO @t;
WHILE @@FETCH_STATUS = 0 BEGIN
    SET @Running += @t;
    UPDATE ... SET RunningTotal = @Running ...
    FETCH NEXT FROM cur INTO @t;
END
CLOSE cur; DEALLOCATE cur;
*/

-- ✅ DESPUÉS: una sola pasada con window function (~0.2 seg)
UPDATE o
SET    RunningTotal = agg.RunningTotal
FROM   Orders o
JOIN  (
    SELECT Id,
        SUM(Total) OVER (
            ORDER BY OrderDate
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS RunningTotal
    FROM Orders
) agg ON o.Id = agg.Id;

-- ─── PATRÓN 2: @TableVariable → #TempTable (estadísticas reales) ───
-- ❌ @table variable: optimizer estima 1 fila siempre
-- DECLARE @Results TABLE (Id INT, Total DECIMAL(18,2));

-- ✅ #temp table: estadísticas reales, puede tener índice
DROP TABLE IF EXISTS #Results;
SELECT Id, SUM(Total) AS Total
INTO   #Results
FROM   Orders
WHERE  Status = 'Completed'
GROUP BY Id;
CREATE INDEX IX_R ON #Results(Id); -- índice antes del JOIN siguiente

-- ─── PATRÓN 3: Function en WHERE → Range explícito ───
-- ❌ Non-SARGable: YEAR() envuelve la columna → Clustered Index Scan
-- WHERE YEAR(OrderDate) = 2024 AND MONTH(OrderDate) = 3

-- ✅ SARGable: optimizer puede usar Index Seek
WHERE OrderDate >= '2024-03-01'
  AND OrderDate  <  '2024-04-01'

-- ─── PATRÓN 4: Parameter Sniffing → OPTION(RECOMPILE) selectivo ───
-- Identificar: ejecutar SP con diferentes parámetros y comparar plans
EXEC usp_GetOrders @CustomerId = 1;   -- plan A (VIP: 50k orders)
EXEC usp_GetOrders @CustomerId = 999; -- plan B (normal: 2 orders)
-- Si los planes son diferentes → parameter sniffing
-- Solución para queries con alta varianza en parámetros:
CREATE OR ALTER PROCEDURE usp_GetOrders @CustomerId INT
AS
    SELECT * FROM Orders
    WHERE  CustomerId = @CustomerId
    OPTION (RECOMPILE);  -- plan único por ejecución, con valor real`;

  codeExample4 = `-- ─── Verificar que los resultados son idénticos ───
-- Si devuelve 0 filas → las versiones old y new son idénticas
SELECT * FROM (
    SELECT Id, Total, OrderDate FROM dbo.usp_GetOrders_OLD(@id)
    EXCEPT
    SELECT Id, Total, OrderDate FROM dbo.usp_GetOrders_NEW(@id)
) diff;
-- Si devuelve filas → hay diferencias en los datos → NO deployar

-- ─── Comparar métricas antes/después en una sola ejecución ───
DECLARE @reads_before INT, @reads_after INT;
DECLARE @t0 DATETIME2 = SYSDATETIME();

-- Captura reads de la sesión actual antes
SELECT @reads_before = logical_reads
FROM   sys.dm_exec_sessions
WHERE  session_id = @@SPID;

-- VERSIÓN NUEVA
EXEC usp_GetOrdersByCustomer_v2 @CustomerId = 42;

-- Captura reads después
SELECT @reads_after = logical_reads
FROM   sys.dm_exec_sessions
WHERE  session_id = @@SPID;

SELECT
    @reads_after - @reads_before          AS logical_reads_used,
    DATEDIFF(ms, @t0, SYSDATETIME())      AS elapsed_ms;`;

  codeExample5 = `-- ─── Monitoreo post-deploy: verificar que los planes se mantienen ───

-- 1. Activar Query Store si no está activo
ALTER DATABASE TuBaseDeDatos
SET QUERY_STORE = ON (
    OPERATION_MODE         = READ_WRITE,
    CLEANUP_POLICY         = (STALE_QUERY_THRESHOLD_DAYS = 30),
    DATA_FLUSH_INTERVAL_SECONDS = 900,
    MAX_STORAGE_SIZE_MB    = 1000,
    INTERVAL_LENGTH_MINUTES = 60
);

-- 2. Verificar en Query Store que el plan nuevo se usa consistentemente
SELECT
    qt.query_sql_text,
    p.plan_id,
    rs.avg_logical_io_reads   AS avg_reads,
    rs.avg_duration / 1000     AS avg_ms,
    rs.count_executions
FROM      sys.query_store_query           q
JOIN      sys.query_store_query_text      qt ON q.query_text_id   = qt.query_text_id
JOIN      sys.query_store_plan            p  ON q.query_id        =  p.query_id
JOIN      sys.query_store_runtime_stats   rs ON p.plan_id         = rs.plan_id
WHERE     qt.query_sql_text LIKE '%usp_GetOrdersByCustomer%'
ORDER BY  rs.last_execution_time DESC;

-- 3. Script de mantenimiento semanal (ejecutar como SQL Agent Job)
-- Actualizar estadísticas con muestreo aumentado
EXEC sp_updatestats; -- para toda la BD
-- O para tablas específicas (más preciso):
UPDATE STATISTICS Orders    WITH FULLSCAN;
UPDATE STATISTICS Customers WITH FULLSCAN;

-- 4. Detectar regresiones automáticamente con Query Store
SELECT
    qt.query_sql_text,
    rsi_last.avg_duration  / 1000 AS last_avg_ms,
    rsi_first.avg_duration / 1000 AS baseline_avg_ms,
    CAST(rsi_last.avg_duration * 1.0
        / NULLIF(rsi_first.avg_duration, 0) AS DECIMAL(5,2)) AS regression_factor
FROM sys.query_store_query       q
-- ... joins con query_store_plan, runtime_stats ...
WHERE regression_factor > 2.0  -- 2x más lento que el baseline
ORDER BY regression_factor DESC;`;

}
