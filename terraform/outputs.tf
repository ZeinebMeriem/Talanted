output "vm_public_ip" {
  description = "Public IP of the Azure VM"
  value       = azurerm_public_ip.main.ip_address
}

output "acr_login_server" {
  description = "ACR login server (e.g. aiuigeneratoracr.azurecr.io)"
  value       = azurerm_container_registry.acr.login_server
}

output "acr_admin_username" {
  description = "ACR admin username"
  value       = azurerm_container_registry.acr.admin_username
  sensitive   = true
}

output "acr_admin_password" {
  description = "ACR admin password"
  value       = azurerm_container_registry.acr.admin_password
  sensitive   = true
}

output "ssh_command" {
  description = "SSH command to connect to the VM"
  value       = "ssh ${var.admin_username}@${azurerm_public_ip.main.ip_address}"
}

output "resource_group_name" {
  value = azurerm_resource_group.main.name
}
