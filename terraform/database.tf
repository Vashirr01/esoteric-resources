# Azure Database for PostgreSQL Flexible Server
# Managed database — Azure handles backups, patching, failover

resource "azurerm_postgresql_flexible_server" "main" {
  name                          = "${var.project_name}-db"
  resource_group_name           = azurerm_resource_group.main.name
  location                      = azurerm_resource_group.main.location
  version                       = "16"
  administrator_login           = var.db_admin_username
  administrator_password        = var.db_admin_password
  public_network_access_enabled = true
  storage_mb                    = 32768
  sku_name                      = "B_Standard_B1ms"

  tags = azurerm_resource_group.main.tags
}

# Firewall rule — allow Azure services to connect
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Create the application database
resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = var.project_name
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}
