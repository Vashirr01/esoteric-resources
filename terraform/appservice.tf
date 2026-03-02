# App Service Plan — the compute that runs your containers
# F1 = free tier (shared, 1GB RAM, 60 min/day CPU)

resource "azurerm_service_plan" "main" {
  name                = "plan-${var.project_name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "F1"

  tags = azurerm_resource_group.main.tags
}

# API Web App — runs the Express API container

resource "azurerm_linux_web_app" "api" {
  name                = "${var.project_name}-api"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    application_stack {
      docker_registry_url      = "https://${azurerm_container_registry.main.login_server}"
      docker_registry_username = azurerm_container_registry.main.admin_username
      docker_registry_password = azurerm_container_registry.main.admin_password
      docker_image_name        = "${azurerm_container_registry.main.login_server}/${var.project_name}-api:latest"
    }
  }

  app_settings = {
    "PORT"                        = "3000"
    "NODE_ENV"                    = "production"
    "DATABASE_URL"                = "postgresql://${var.db_admin_username}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${var.project_name}?sslmode=require"
    "KEYCLOAK_URL"                = "https://${var.project_name}-auth.azurewebsites.net"
    "KEYCLOAK_REALM"              = "cloud-lab"
    "WEBSITES_PORT"               = "3000"
  }

  tags = azurerm_resource_group.main.tags
}

# Frontend Web App — runs the React container (nginx serving static build)

resource "azurerm_linux_web_app" "web" {
  name                = "${var.project_name}-web"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    application_stack {
      docker_registry_url      = "https://${azurerm_container_registry.main.login_server}"
      docker_registry_username = azurerm_container_registry.main.admin_username
      docker_registry_password = azurerm_container_registry.main.admin_password
      docker_image_name        = "${azurerm_container_registry.main.login_server}/${var.project_name}-web:latest"
    }
  }

  tags = azurerm_resource_group.main.tags
}
