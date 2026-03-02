# Terraform IaC for Azure — Design

## Goal

Define Azure infrastructure as Terraform code. Learn IaC patterns with `terraform plan` without spending credits. Apply later when ready to deploy.

## Structure

```
terraform/
├── main.tf           # Provider config, resource group
├── variables.tf      # Input variables
├── outputs.tf        # Output values (URLs, connection strings)
├── acr.tf            # Azure Container Registry
├── appservice.tf     # App Service plan + web apps
├── database.tf       # PostgreSQL Flexible Server
├── keyvault.tf       # Key Vault for secrets
└── terraform.tfvars  # Variable values (gitignored)
```

## Resources

- Resource Group
- Container Registry (Basic SKU)
- App Service Plan (F1 free tier)
- Linux Web App x2 (API + frontend)
- PostgreSQL Flexible Server (Burstable B1ms)
- Key Vault

## Decisions

- Plan only — don't apply until ready
- Docker Compose stays for local dev
- Terraform handles cloud infra only
- State file stored locally for now (move to Azure Blob later)
