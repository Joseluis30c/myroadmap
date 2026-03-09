import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week2',
  imports: [RouterLink],
  templateUrl: './week2.html',
})
export class Week2 {

  codeExample1 = `WITH OrgChart AS (
    -- Anchor: empleados raíz (sin manager)
    SELECT Id, Name, ManagerId, Salary,
        0                                  AS Level,
        CAST(Name AS VARCHAR(1000))       AS Path
    FROM  Employees
    WHERE ManagerId IS NULL
    UNION ALL
    -- Recursive: subordinados de cada nivel
    SELECT e.Id, e.Name, e.ManagerId, e.Salary,
        oc.Level + 1,
        CAST(oc.Path + ' > ' + e.Name AS VARCHAR(1000))
    FROM  Employees e
    JOIN  OrgChart  oc ON e.ManagerId = oc.Id
),
-- Segundo CTE encadenado: salario promedio por nivel
AvgByLevel AS (
    SELECT Level, AVG(Salary) AS AvgSalary
    FROM   OrgChart
    GROUP BY Level
)
SELECT
    REPLICATE('  ', oc.Level) + oc.Name AS IndentedName,
    oc.Level, oc.Path, oc.Salary,
    al.AvgSalary                   AS AvgForLevel,
    oc.Salary - al.AvgSalary        AS VsAverage
FROM  OrgChart   oc
JOIN  AvgByLevel al ON oc.Level = al.Level
ORDER BY oc.Path
OPTION (MAXRECURSION 50);`;

  codeExample2 = `-- 1. ROW_NUMBER — deduplicar: quedarse con la última orden por cliente
WITH Ranked AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY CustomerId
            ORDER BY     OrderDate DESC
        ) AS rn
    FROM Orders
)
SELECT * FROM Ranked WHERE rn = 1;

-- 2. SUM acumulativo (running total)
SELECT OrderDate, Total,
    SUM(Total) OVER (
        ORDER BY OrderDate
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS RunningTotal
FROM Orders;

-- 3. LAG / LEAD — comparar con fila anterior
SELECT Mes, Ventas,
    LAG(Ventas, 1, 0) OVER (ORDER BY Mes) AS MesAnterior,
    Ventas - LAG(Ventas, 1, 0) OVER (ORDER BY Mes) AS Crecimiento
FROM VentasMensuales;

-- 4. NTILE — dividir en cuartiles
SELECT Name, Sales,
    NTILE(4) OVER (ORDER BY Sales DESC) AS Quartile
FROM SalesPeople;

-- 5. Promedio móvil de 3 períodos
SELECT Fecha, Valor,
    AVG(CAST(Valor AS FLOAT)) OVER (
        ORDER BY Fecha
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS MovingAvg3
FROM DailySales;

-- 6. % del total del grupo (sin subquery correlacionado)
SELECT DepartmentId, Name, Salary,
    100.0 * Salary /
        SUM(Salary) OVER (PARTITION BY DepartmentId) AS PctOfDept
FROM Employees;

-- 7. PERCENT_RANK — percentil de cada empleado en su depto
SELECT Name, DepartmentId, Salary,
    PERCENT_RANK() OVER (
        PARTITION BY DepartmentId
        ORDER BY     Salary
    ) AS Percentile
FROM Employees;`;

  codeExample3 = `-- Función en columna del JOIN → Non-SARGable
JOIN Products p
  ON LOWER(o.Sku) = LOWER(p.Sku)

-- Conversión implícita de tipos
JOIN Customers c
  ON o.CustomerId = c.Code
-- INT vs VARCHAR → implicit cast, Index Scan

-- Subconsulta correlacionada (N+1)
SELECT *,
  (SELECT SUM(Total) FROM Orders
   WHERE CustomerId = c.Id)
FROM Customers c; -- N scans de Orders`;

  codeExample4 = `-- Columnas limpias → Index Seek
JOIN Products p
  ON o.Sku = p.Sku

-- Mismos tipos en la columna JOIN
JOIN Customers c
  ON o.CustomerId = c.Id -- INT=INT

-- JOIN + agregación: 1 solo escaneo
SELECT c.*,
    SUM(o.Total) OVER
        (PARTITION BY o.CustomerId)
FROM Customers c
JOIN Orders o ON c.Id = o.CustomerId;`;

  codeExample5 = `-- ❌ Subconsulta correlacionada: ejecuta N veces (una por cliente)
SELECT c.Id, c.Name,
    (SELECT MAX(OrderDate) FROM Orders WHERE CustomerId = c.Id) AS LastOrder,
    (SELECT COUNT(*)       FROM Orders WHERE CustomerId = c.Id) AS OrderCount,
    (SELECT SUM(Total)     FROM Orders WHERE CustomerId = c.Id) AS TotalSpent
FROM Customers c;
-- 3 subconsultas × N clientes = 3N escaneos de Orders

-- ✅ Un solo LEFT JOIN con agregación: Orders se lee UNA vez
SELECT c.Id, c.Name,
    o.LastOrder, o.OrderCount, o.TotalSpent
FROM Customers c
LEFT JOIN (
    SELECT CustomerId,
        MAX(OrderDate) AS LastOrder,
        COUNT(*)       AS OrderCount,
        SUM(Total)     AS TotalSpent
    FROM    Orders
    GROUP BY CustomerId
) o ON c.Id = o.CustomerId;

-- OUTER APPLY: top N por grupo (más eficiente que ROW_NUMBER si hay índice)
SELECT c.Id, c.Name, latest.OrderDate, latest.Total
FROM Customers c
OUTER APPLY (
    SELECT TOP 1 OrderDate, Total
    FROM    Orders
    WHERE   CustomerId = c.Id
    ORDER BY OrderDate DESC
) latest;`;

  codeExample6 = `-- 1. Ver histograma completo de un índice
DBCC SHOW_STATISTICS('Orders', 'IX_Orders_Customer_Date') WITH HISTOGRAM;
-- RANGE_HI_KEY: valor máximo del bucket
-- EQ_ROWS:      filas iguales a ese valor
-- RANGE_ROWS:   filas en el rango del bucket

-- 2. Ver antigüedad de estadísticas
SELECT
    s.name         AS stat_name,
    sp.last_updated,
    sp.rows,
    CAST(100.0 * sp.rows_sampled / sp.rows AS DECIMAL(5,2)) AS pct_sampled
FROM sys.stats s
CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) sp
WHERE OBJECT_NAME(s.object_id) = 'Orders'
ORDER BY sp.last_updated;

-- 3. Actualizar con FULLSCAN (más preciso que el muestreo 20%)
UPDATE STATISTICS Orders WITH FULLSCAN;

-- 4. Parameter Sniffing — Solución 1: OPTION(RECOMPILE)
CREATE OR ALTER PROCEDURE usp_GetOrders @CustomerId INT
AS
SELECT * FROM Orders WHERE CustomerId = @CustomerId
OPTION (RECOMPILE); -- recompila con valor real cada vez

-- Solución 2: OPTIMIZE FOR UNKNOWN (usa densidad promedio)
SELECT * FROM Orders WHERE CustomerId = @CustomerId
OPTION (OPTIMIZE FOR (@CustomerId UNKNOWN));

-- Solución 3: variable local (plan genérico pero estable)
DECLARE @LocalId INT = @CustomerId;
SELECT * FROM Orders WHERE CustomerId = @LocalId;`;

  codeExample7 = `-- KEYSET PAGINATION — O(log n) sin importar la página
SELECT TOP (@PageSize) Id, Name, OrderDate
FROM  Orders
WHERE OrderDate < @LastOrderDate
   OR (OrderDate = @LastOrderDate AND Id < @LastId)
ORDER BY OrderDate DESC, Id DESC;

-- TEMP TABLE con índice — cuando el CTE no puede ver estadísticas intermedias
DROP TABLE IF EXISTS #TopCustomers;

SELECT
    CustomerId,
    SUM(Total) AS TotalSpent,
    COUNT(*)  AS OrderCount
INTO #TopCustomers
FROM   Orders
WHERE  OrderDate >= '2024-01-01'
GROUP BY CustomerId
HAVING SUM(Total) > 10000;

-- Agregar índice antes del JOIN siguiente
CREATE NONCLUSTERED INDEX IX_TC
    ON #TopCustomers (CustomerId) INCLUDE (TotalSpent);

-- Ahora el JOIN tiene estadísticas reales de la temp table
SELECT
    c.Name, c.Region,
    tc.TotalSpent, tc.OrderCount,
    RANK() OVER (
        PARTITION BY c.Region
        ORDER BY     tc.TotalSpent DESC
    ) AS RankInRegion
FROM  Customers     c
JOIN  #TopCustomers tc ON c.Id = tc.CustomerId
ORDER BY c.Region, RankInRegion;`;

}
