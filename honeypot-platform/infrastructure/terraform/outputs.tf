output "cluster_endpoint" {
  description = "EKS cluster API server endpoint"
  value       = aws_eks_cluster.honeypot_cluster.endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.honeypot_cluster.name
}

output "db_host" {
  description = "RDS PostgreSQL hostname"
  value       = aws_db_instance.honeypot_postgres.address
}

output "db_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.honeypot_postgres.port
}

output "redis_host" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_cluster.honeypot_redis.cache_nodes[0].address
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.honeypot_vpc.id
}
