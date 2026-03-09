import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week1',
  imports: [RouterLink],
  templateUrl: './week1.html',
})
export class Week1 {

  codeExample1 = `-- 1. SET STATISTICS IO — ver cuántas páginas leyó la query
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
GO

-- Tu query aquí
SELECT * FROM Orders WHERE CustomerId = 42;
GO

-- Resultado en Messages:
-- Table 'Orders'. Scan count 1, logical reads 15234  ← ⚠ demasiadas!
-- SQL Server Execution Times: CPU time = 234 ms, elapsed time = 891 ms

-- 2. DMVs — encontrar las queries más costosas del servidor
SELECT TOP 10
    total_logical_reads / execution_count AS avg_logical_reads,
    total_elapsed_time  / execution_count AS avg_elapsed_time_µs,
    execution_count,
    SUBSTRING(st.text, (qs.statement_start_offset/2)+1,
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(st.text)
            ELSE qs.statement_end_offset
        END - qs.statement_start_offset)/2)+1) AS query_text
FROM   sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
ORDER BY avg_logical_reads DESC;

-- 3. Missing Index DMV — SQL Server te dice qué índice necesitas
SELECT TOP 10
    migs.avg_total_user_cost * migs.avg_user_impact
        * (migs.user_seeks + migs.user_scans) AS improvement_score,
    'CREATE INDEX IX_' + mid.object_id
        + ' ON ' + mid.statement
        + ' (' + ISNULL(mid.equality_columns, '') + ')'
        + CASE WHEN mid.included_columns IS NOT NULL
            THEN ' INCLUDE (' + mid.included_columns + ')'
            ELSE '' END AS suggested_index
FROM sys.dm_db_missing_index_groups mig
JOIN sys.dm_db_missing_index_group_stats migs ON mig.index_group_handle = migs.group_handle
JOIN sys.dm_db_missing_index_details mid  ON mig.index_handle = mid.index_handle
ORDER BY improvement_score DESC;`;

  codeExample2 = `-- Función en la columna indexada = Scan
WHERE YEAR(OrderDate) = 2024
WHERE LEFT(LastName, 3) = 'GOM'
WHERE CONVERT(VARCHAR, Id) = '42'
WHERE Price * 1.1 > 100
WHERE Name LIKE '%Lopez%'  -- wildcard al inicio`;

  codeExample3 = `-- Columna limpia a la izquierda = Seek
WHERE OrderDate BETWEEN '2024-01-01' AND '2024-12-31'
WHERE LastName LIKE 'GOM%'  -- wildcard al final ✓
WHERE Id = 42               -- tipo correcto, sin cast
WHERE Price > 100 / 1.1     -- mover la operación al valor
WHERE Name = 'Lopez'        -- igualdad exacta ✓`;

  codeExample4 = `-- Crear tabla de práctica con datos
CREATE TABLE Orders (
    Id         INT PRIMARY KEY,
    CustomerId INT           NOT NULL,
    OrderDate  DATETIME2     NOT NULL,
    Total      DECIMAL(10,2) NOT NULL,
    Status     VARCHAR(20)  NOT NULL
);

CREATE NONCLUSTERED INDEX IX_Orders_Date
    ON Orders(OrderDate);

-- Insertar 100k filas para que el plan sea representativo
INSERT INTO Orders
SELECT n, ABS(CHECKSUM(NEWID()) % 1000),
    DATEADD(day, -ABS(CHECKSUM(NEWID()) % 1095), GETDATE()),
    CAST(ABS(CHECKSUM(NEWID())) % 1000 AS DECIMAL(10,2)), 'Pending'
FROM (SELECT TOP 100000 ROW_NUMBER() OVER(ORDER BY o.object_id) n
      FROM sys.objects o, sys.objects o2) t;

-- EJERCICIO: Activa Ctrl+M (Actual Plan) y compara cada par

-- ❌ Scan — REESCRIBIR
SELECT * FROM Orders WHERE YEAR(OrderDate) = 2026;

-- ✅ Tu solución aquí:
SELECT * FROM Orders
WHERE OrderDate BETWEEN '2026-01-01' AND '2026-12-31 23:59:59.999';`;

  codeExample5 = `-- 1. Ver fragmentación de todos los índices
SELECT
    OBJECT_NAME(ips.object_id)  AS table_name,
    i.name                         AS index_name,
    ips.avg_fragmentation_in_percent,
    ips.page_count,
    ips.record_count
FROM sys.dm_db_index_physical_stats(
    DB_ID(), NULL, NULL, NULL, 'DETAILED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id
                    AND ips.index_id = i.index_id
WHERE ips.avg_fragmentation_in_percent > 5
ORDER BY avg_fragmentation_in_percent DESC;

-- 2. Regla: 5-30% → REORGANIZE | >30% → REBUILD
-- REORGANIZE (online, menos recursos):
ALTER INDEX IX_Orders_CustomerId
    ON Orders REORGANIZE;

-- REBUILD (offline por defecto, resetea estadísticas):
ALTER INDEX ALL ON Orders
    REBUILD WITH (FILLFACTOR = 85, ONLINE = ON);
-- FILLFACTOR=85 → deja 15% libre para inserts futuros sin page split

-- 3. Actualizar estadísticas (el optimizer las necesita frescas)
UPDATE STATISTICS Orders WITH FULLSCAN; -- lee toda la tabla
-- O para toda la BD:
EXEC sp_updatestats;

-- 4. Ver si las estadísticas están obsoletas
SELECT OBJECT_NAME(stat.object_id) table_name,
       stat.name                     stat_name,
       sp.last_updated,
       sp.rows,
       sp.rows_sampled
FROM sys.stats stat
CROSS APPLY sys.dm_db_stats_properties(stat.object_id, stat.stats_id) sp
ORDER BY sp.last_updated;`;

  codeExample6 = `-- QUERY que necesitamos optimizar
SELECT OrderDate, Total, Status
FROM   Orders
WHERE  CustomerId = 42
ORDER BY OrderDate DESC;

-- Con solo este índice → Key Lookup para buscar Total y Status
CREATE NONCLUSTERED INDEX IX_Orders_Customer_v1
    ON Orders (CustomerId, OrderDate DESC);
-- Execution plan muestra: Index Seek + Key Lookup (malo)

-- ✅ Covering Index — INCLUDE las columnas del SELECT
CREATE NONCLUSTERED INDEX IX_Orders_Customer_Covering
    ON Orders (CustomerId, OrderDate DESC)  -- Key columns: para WHERE y ORDER BY
    INCLUDE (Total, Status);               -- Include: para el SELECT sin Key Lookup
-- Execution plan muestra: SOLO Index Seek ← perfecto

-- Filtered Index — solo pedidos activos
CREATE NONCLUSTERED INDEX IX_Orders_Active
    ON Orders (CustomerId, OrderDate DESC)
    INCLUDE (Total)
    WHERE  Status = 'Active';  -- solo indexa filas activas

-- Composite index — orden correcto de columnas
-- Regla: Equality first, then Range
-- WHERE CustomerId = 42 AND OrderDate BETWEEN ... AND ...
CREATE NONCLUSTERED INDEX IX_Orders_EqualityRange
    ON Orders (CustomerId,  -- Equality primero
               OrderDate)   -- Range después
    INCLUDE   (Total, Status);`;

  codeExample7 = `-- PASO 1: Encontrar queries costosas (top 5 por lecturas lógicas)
SELECT TOP 5
    SUBSTRING(st.text, 1, 200)                           AS query_snippet,
    qs.total_logical_reads / qs.execution_count           AS avg_reads,
    qs.total_elapsed_time  / qs.execution_count / 1000   AS avg_ms,
    qs.execution_count,
    qp.query_plan
FROM   sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
CROSS APPLY sys.dm_exec_query_plan(qs.plan_handle) qp
ORDER BY avg_reads DESC;

-- PASO 2: Medir baseline de la query lenta
SET STATISTICS IO   ON;
SET STATISTICS TIME ON;
SET NOCOUNT         ON;
GO

-- La query problemática
SELECT o.OrderDate, o.Total, c.Name
FROM   Orders o
JOIN   Customers c ON o.CustomerId = c.Id
WHERE  o.Status = 'Pending'
  AND  o.OrderDate >= DATEADD(month, -3, GETDATE())
ORDER BY o.OrderDate DESC;
GO
-- Anota los logical reads aquí: ___________

-- PASO 3: Crear el índice correcto (basado en el plan)
-- Equality: Status | Range: OrderDate | INCLUDE: Total
CREATE NONCLUSTERED INDEX IX_Orders_Status_Date_Covering
    ON Orders (Status, OrderDate DESC)
    INCLUDE  (Total, CustomerId)
    WHERE    Status = 'Pending';  -- Filtered! Solo indexa Pending

-- PASO 4: Medir después
-- Ejecuta la misma query y compara logical reads
-- Anota los logical reads después: ___________
-- Mejora: _______x`;

}
