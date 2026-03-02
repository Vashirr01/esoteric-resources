variable "project_name" {
  description = "Base name for all resources"
  type        = string
  default     = "cloudlab"
}

variable "location" {
  description = "Azure region to deploy resources"
  type        = string
  default     = "eastus"
}

variable "db_admin_username" {
  description = "PostgreSQL admin username"
  type        = string
  default     = "cloudlab"
}

variable "db_admin_password" {
  description = "PostgreSQL admin password"
  type        = string
  sensitive   = true
}
