# Ford Motor Company - GCP Infrastructure Variables

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev, stg, prd)"
  type        = string
  validation {
    condition     = contains(["dev", "stg", "prd"], var.environment)
    error_message = "Environment must be one of: dev, stg, prd"
  }
}

variable "team" {
  description = "Team code (must be approved team code)"
  type        = string
}

variable "cost_center" {
  description = "Finance-approved cost center code"
  type        = string
}
