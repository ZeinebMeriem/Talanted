variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
  # Set via TF_VAR_subscription_id env var in Jenkins credentials
}

variable "resource_group_name" {
  description = "Azure Resource Group name"
  type        = string
  default     = "ai-ui-generator-rg"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "francecentral"
}

variable "acr_name" {
  description = "Azure Container Registry name (globally unique, alphanumeric only, max 50 chars)"
  type        = string
  default     = "aiuigeneratoracr"
}

variable "vm_size" {
  description = "Azure VM size — Standard_D4s_v3 = 4 vCPU / 16 GB RAM (handles 13 Docker services)"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "admin_username" {
  description = "VM SSH admin username"
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key on the Jenkins agent"
  type        = string
  default     = "/var/jenkins_home/.ssh/id_rsa.pub"
}

variable "environment" {
  description = "Environment tag (staging / production)"
  type        = string
  default     = "staging"
}
