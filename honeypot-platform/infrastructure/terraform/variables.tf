variable "region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Deployment environment (dev/staging/prod)"
  type        = string
  default     = "dev"
}

variable "db_instance_type" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "eks_node_instance_type" {
  description = "EKS worker node EC2 instance type"
  type        = string
  default     = "t3.medium"
}
