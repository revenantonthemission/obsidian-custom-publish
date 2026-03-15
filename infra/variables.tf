variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-northeast-2"
}

variable "bucket_name" {
  description = "S3 bucket name for the static site"
  type        = string
}

variable "domain_name" {
  description = "Custom domain name (optional, leave empty to use CloudFront domain)"
  type        = string
  default     = ""
}
