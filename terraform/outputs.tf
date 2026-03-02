# Outputs — values Terraform reports after apply
# These are the connection details you'd need to configure your app

output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "acr_login_server" {
  description = "Container registry URL — push images here"
  value       = azurerm_container_registry.main.login_server
}

output "api_url" {
  description = "API endpoint"
  value       = "https://${azurerm_linux_web_app.api.default_hostname}"
}

output "web_url" {
  description = "Frontend URL"
  value       = "https://${azurerm_linux_web_app.web.default_hostname}"
}

output "db_fqdn" {
  description = "PostgreSQL server hostname"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "key_vault_uri" {
  description = "Key Vault URI for secret references"
  value       = azurerm_key_vault.main.vault_uri
}
