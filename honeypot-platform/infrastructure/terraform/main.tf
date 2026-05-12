terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.5.0"
}

provider "aws" {
  region = var.region
}

# ── VPC ───────────────────────────────────────────────────────────────────────
resource "aws_vpc" "honeypot_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "honeypot-vpc-${var.environment}" }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.honeypot_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.region}a"
  map_public_ip_on_launch = true
  tags = { Name = "honeypot-public-a" }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.honeypot_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.region}b"
  map_public_ip_on_launch = true
  tags = { Name = "honeypot-public-b" }
}

# ── EKS Cluster ───────────────────────────────────────────────────────────────
resource "aws_eks_cluster" "honeypot_cluster" {
  name     = "honeypot-${var.environment}"
  role_arn = aws_iam_role.eks_role.arn

  vpc_config {
    subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  }

  tags = { Environment = var.environment }
}

resource "aws_iam_role" "eks_role" {
  name = "honeypot-eks-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_role.name
}

# ── RDS PostgreSQL ─────────────────────────────────────────────────────────────
resource "aws_db_instance" "honeypot_postgres" {
  identifier             = "honeypot-postgres-${var.environment}"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = var.db_instance_type
  allocated_storage      = 20
  max_allocated_storage  = 100
  db_name                = "honeypot"
  username               = "honeypot_admin"
  password               = var.db_password
  vpc_security_group_ids = []
  db_subnet_group_name   = aws_db_subnet_group.honeypot_db_subnet.name
  skip_final_snapshot    = true
  deletion_protection    = false

  tags = { Name = "honeypot-postgres" }
}

resource "aws_db_subnet_group" "honeypot_db_subnet" {
  name       = "honeypot-db-subnet"
  subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}

# ── ElastiCache Redis ─────────────────────────────────────────────────────────
resource "aws_elasticache_cluster" "honeypot_redis" {
  cluster_id           = "honeypot-redis-${var.environment}"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
}
