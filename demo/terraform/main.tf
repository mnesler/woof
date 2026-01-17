# Ford Motor Company - GCP Infrastructure
# Terraform configuration for demo

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # TODO: Configure backend for state storage
  # backend "gcs" {
  #   bucket = "ford-prd-platform-tfstate"
  #   prefix = "demo"
  # }
}

provider "google" {
  # TODO: Configure project and region
  # project = var.project_id
  # region  = var.region
}

# =============================================================================
# Resources will be added here by the AI agent following Ford standards
# =============================================================================
