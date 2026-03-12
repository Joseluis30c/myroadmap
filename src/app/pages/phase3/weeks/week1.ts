import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-week1',
  imports: [RouterLink],
  templateUrl: './week1.html',
})
export class Week1 {
  codeExample1 = `--azure_setup.sh

# ─── 1. Login y seleccionar suscripción ───
az login
az account list --output table
az account set --subscription "[tu-subscription-id]"

# ─── 2. Crear Resource Group (contenedor de todos tus recursos) ───
az group create \
  --name     "rg-miapi-dev" \
  --location "eastus"

# Verificar
az group list --output table

# ─── 3. Variables de entorno (mejor que hardcodear) ───
export RESOURCE_GROUP="rg-miapi-dev"
export LOCATION="eastus"
export APP_NAME="miapi-$(date +%s)"  # nombre único
export SQL_SERVER="sql-miapi-dev"
export SQL_DB="db-miapi"

# ─── 4. Nomenclatura recomendada Microsoft ───
# rg-[proyecto]-[env]     → rg-miapi-dev
# app-[proyecto]-[env]    → app-miapi-dev
# sql-[proyecto]-[env]    → sql-miapi-dev
# st[proyecto][env]       → stmiapistg (Storage: sin guiones)
# vnet-[proyecto]-[env]   → vnet-miapi-dev

# ─── 5. Limpiar todo al terminar (solo en dev!) ───
# az group delete --name "rg-miapi-dev" --yes --no-wait
# Elimina TODOS los recursos del grupo en un solo comando`;

  codeExample2 = ``;

  codeExample3 = ``;

  codeExample4 = ``;

  codeExample5 = ``;

  codeExample6 = ``;

  codeExample7 = ``;
}
