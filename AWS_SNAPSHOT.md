# AWS Application Stack Snapshot — Empowered Sports Camp

**Generated:** 2026-04-01
**Account:** 024460283944
**Region:** us-east-2 (Ohio)
**IAM User:** empowered-app-user

---

## Executive Summary

| Service | Count | Status |
|---------|-------|--------|
| S3 Buckets | 4 | Active |
| RDS Instances | 1 | Available |
| Cognito User Pools | 1 | Active (76 users) |
| EC2 Instances | 1 | **STOPPED** |
| IAM Users | 3 | Active |
| IAM Roles | 8 | Active |
| Route 53 Hosted Zones | 1 | Active |
| ACM Certificates | 2 | 1 ISSUED, 1 **FAILED** |
| SNS Topics | 1 | Active |
| ECR Repositories | 1 | Active |
| KMS Keys | 1 | AWS-managed |
| SES Identities | 1 | Verified (sandbox) |
| Security Groups | 3 | Active |
| Lambda Functions | 0 | — |
| DynamoDB Tables | 0 | — |
| CloudFormation Stacks | 0 | — |
| API Gateway | 0 | — |
| CloudFront | 0 | — |
| SQS Queues | 0 | — |
| ECS Clusters | 0 | — |
| Load Balancers | 0 | — |
| CloudTrail | 0 | **Not configured** |
| CloudWatch Log Groups | 0 | — |

**March 2026 Cost:** ~$0.00 (mostly free tier, $0.34 S3, $0.004 RDS)

---

## WARNINGS & RISKS

### CRITICAL

1. **RDS: Storage NOT encrypted** — `empowered-db` has `StorageEncrypted: false`. Customer PII (athlete names, parent info, medical data) is stored unencrypted at rest.
2. **RDS: Deletion protection OFF** — A single `delete-db-instance` call could destroy the production database.
3. **RDS: Publicly accessible** — Database is open to the internet on port 5432. Security group `sg-0af4e550bd24bf8a9` allows `0.0.0.0/0` on port 5432.
4. **S3: `empowered-sports-camp-new` is fully public** — Bucket policy allows `s3:GetObject` to `Principal: *`. Public access block is completely disabled.
5. **S3: CORS allows all origins** (`*`) — Should be restricted to `empoweredsportscamp.com` and `localhost:3000`.
6. **IAM: All 3 users have AdministratorAccess** — `empowered-app-user` (the app service account) has full admin. Should use least-privilege.
7. **Cognito: MFA is OFF** — No multi-factor authentication for user accounts.
8. **Cognito: Deletion protection INACTIVE** — Pool could be accidentally deleted.
9. **CloudTrail: Not configured** — No audit logging of AWS API calls. No way to investigate security incidents.
10. **Security Group: SSH (port 22) open to 0.0.0.0/0** — `empowered-web-sg` allows SSH from anywhere.

### HIGH

11. **RDS: Backup retention = 1 day** — Only 1 day of automated backups. Should be at least 7 days for production.
12. **RDS: Single-AZ** — No Multi-AZ failover. A single AZ outage takes down the database.
13. **RDS: No Performance Insights** — No monitoring of query performance.
14. **EC2 instance is STOPPED** — `empowered-sports-camp` (t3.small) is stopped. If it's unused, it should be terminated to avoid EBS charges. If needed, it should be running.
15. **ACM: Failed certificate** — `empoweredsportcamp.com` (note: missing 's') certificate is in FAILED status.
16. **SES: Sandbox mode** — `ProductionAccessEnabled: false`. Can only send to verified emails. Production access was **DENIED**.
17. **ECR: Scan-on-push disabled** — Container images are not scanned for vulnerabilities.
18. **ECR: Mutable image tags** — Tags can be overwritten, creating supply chain risk.

### MEDIUM

19. **S3: No lifecycle rules** on any bucket — Storage costs will grow indefinitely.
20. **RDS: `gp2` storage** — Should upgrade to `gp3` for better performance and lower cost.
21. **Route 53: `www` points to CloudFront** (`d3ujwvqv85berc.cloudfront.net`) but no CloudFront distribution exists in this account. This may be Vercel's CDN or a leftover.
22. **Cognito: Using COGNITO_DEFAULT email** — Limited to 50 emails/day. Should configure SES for production email delivery.
23. **No CloudWatch monitoring** — Zero log groups, zero alarms.
24. **SNS topic `amplify_codecommit_topic`** — Appears to be a leftover from an Amplify setup attempt.

---

## SERVICE DETAILS

### RDS — PostgreSQL Database

```
Instance ID:        empowered-db
Engine:             PostgreSQL 17.6
Instance Class:     db.t3.micro (2 vCPU, 1 GB RAM)
Storage:            20 GB gp2 (NOT encrypted)
Endpoint:           empowered-db.c7uo6ao4q57y.us-east-2.rds.amazonaws.com:5432
Database Name:      empowered
Master Username:    empowered
Availability Zone:  us-east-2b
Multi-AZ:           No
Publicly Accessible: Yes
Deletion Protection: No
Backup Retention:   1 day
Backup Window:      04:08-04:38 UTC
Maintenance Window: Sat 08:32-09:02 UTC
VPC:                vpc-07842bab165a9f149
Security Group:     sg-0af4e550bd24bf8a9 (empowered-rds-sg)
  Inbound:          TCP 5432 from 0.0.0.0/0 (WORLD OPEN)
Subnet Group:       empowered-db-subnet-group (us-east-2a, 2b, 2c)
SSL Certificate:    rds-ca-rsa2048-g1 (valid until 2027-01-20)
Latest Restore:     2026-04-01T15:59:32Z
```

**Snapshots:**
| ID | Created | Storage |
|----|---------|---------|
| empowered-db-backup-20260120 | 2026-01-20 | 20 GB |
| rds:empowered-db-2026-03-31-04-14 | 2026-03-31 | 20 GB |
| rds:empowered-db-2026-04-01-04-14 | 2026-04-01 | 20 GB |

**Data Summary:** 11 camps, 82 athletes, 80 registrations, 6 profiles, 76 Cognito users

---

### S3 Buckets

#### empowered-sports-camp-new (Primary App Storage)
```
Created:            2026-01-21
Versioning:         Enabled
Encryption:         AES256 (SSE-S3)
Public Access Block: ALL DISABLED
Bucket Policy:      Public read (s3:GetObject to Principal *)
CORS:               AllowedOrigins: * | Methods: GET,PUT,POST,DELETE,HEAD
Lifecycle Rules:    None
```

#### empowered-sports-camp-backups
```
Created:            2026-01-20
Versioning:         Enabled
Public Access Block: ALL ENABLED (secure)
```

#### empowered-sports-camp-frontend
```
Created:            2026-01-20
Versioning:         Not enabled
Public Access Block: ALL ENABLED (secure)
```

#### aws-sam-cli-managed-default-samclisourcebucket-vylcxzq0ursq
```
Created:            2026-01-22
Purpose:            SAM CLI deployment artifacts
```

---

### Cognito User Pool

```
Pool ID:            us-east-2_mNOJUg81i
Pool Name:          empowered-sports-camp
Tier:               ESSENTIALS
Users:              ~76
MFA:                OFF
Deletion Protection: INACTIVE
Sign-in:            Email (username attribute)
Auto-verify:        Email
Password Policy:    Min 8, upper+lower+number+symbol
Email Sending:      COGNITO_DEFAULT (50/day limit)
Lambda Triggers:    None configured
Recovery:           1. verified_email, 2. verified_phone_number
```

**App Client: empowered-web-client**
```
Client ID:          10cojamhbaicqni6hdr598jjjk
Auth Flows:         USER_SRP_AUTH, USER_PASSWORD_AUTH, REFRESH_TOKEN_AUTH
OAuth:              Disabled
Callback URLs:      http://localhost:3000/callback
                    https://empoweredsportscamp.com/callback
Logout URLs:        http://localhost:3000
                    https://empoweredsportscamp.com
Refresh Token:      30 days
Token Revocation:   Enabled
```

---

### Route 53

**Zone: empoweredsportscamp.com** (ID: Z03251301Y8G45YZPM915)

| Name | Type | TTL | Value |
|------|------|-----|-------|
| empoweredsportscamp.com | NS | 172800 | ns-944.awsdns-54.net, ns-1062.awsdns-04.org, ns-1748.awsdns-26.co.uk, ns-297.awsdns-37.com |
| empoweredsportscamp.com | SOA | 900 | ns-944.awsdns-54.net. awsdns-hostmaster.amazon.com. |
| _2987387c6031e... | CNAME | 500 | ACM validation record |
| www.empoweredsportscamp.com | CNAME | 500 | d3ujwvqv85berc.cloudfront.net |

**Note:** `www` → CloudFront, but bare domain (`empoweredsportscamp.com`) has no A/AAAA record. Users visiting the bare domain will get a DNS error.

---

### ACM Certificates (us-east-1)

| Domain | Status | SANs | In Use |
|--------|--------|------|--------|
| empoweredsportscamp.com | **ISSUED** | *.empoweredsportscamp.com | No |
| empoweredsportcamp.com | **FAILED** | *.empoweredsportcamp.com (typo - missing 's') | No |

---

### SES (Simple Email Service)

```
Sending Enabled:        Yes
Production Access:      NO (SANDBOX MODE)
Production Review:      DENIED (case 176978837600153)
Enforcement Status:     HEALTHY
Max Send Rate:          1/sec
Max 24hr Send:          200 emails
Sent Last 24hr:         0
```

**Identity:** estroop3@gmail.com — Verified, DKIM not configured

**Impact:** SES is in sandbox. The app likely uses **Resend** (RESEND_API_KEY in .env) for email instead of SES directly.

---

### EC2 Instance

```
Instance ID:        i-0a081fb10eb7e69cb
Name:               empowered-sports-camp
State:              STOPPED
Type:               t3.small (2 vCPU, 2 GB RAM)
AMI:                ami-0057c7861f0e3dfa1
Key Pair:           empowered-key
AZ:                 us-east-2c
Private IP:         172.31.34.104
Public IP:          None (stopped)
IAM Profile:        empowered-ssm-profile (empowered-ssm-role)
Security Group:     sg-00ab9b4564412f203 (empowered-web-sg)
  Inbound:          TCP 22 from 0.0.0.0/0
                    TCP 80 from 0.0.0.0/0
                    TCP 443 from 0.0.0.0/0
                    TCP 3000 from 0.0.0.0/0
Monitoring:         Disabled
EBS Volume:         vol-0c68ec5facc0fe278 (delete on termination)
```

**Note:** This instance appears to be from an earlier deployment attempt before migrating to Vercel. It has been stopped since ~Jan 21.

---

### IAM Users

| User | Created | Last Login | Policies |
|------|---------|------------|----------|
| Empowered | 2025-12-25 | 2026-01-21 | AdministratorAccess, IAMUserChangePassword, ElasticBeanstalk-Admin, Amplify-Admin |
| empowered-app-user | 2026-01-20 | Never (programmatic) | **AdministratorAccess**, CognitoPowerUser, SESFullAccess, SNSFullAccess, CodeCommitPowerUser, S3FullAccess, Amplify-Admin |
| BattleBuddy | 2026-04-01 | 2026-04-01 | AdministratorAccess, IAMUserChangePassword, ElasticBeanstalk-Admin, Amplify-Admin |

### IAM Roles (Custom)

| Role | Trusted By | Purpose |
|------|-----------|---------|
| AmplifyServiceRole | amplify.amazonaws.com | Amplify deployments |
| empowered-s3-replication-role | s3.amazonaws.com | S3 cross-region replication |
| empowered-ssm-role | ec2.amazonaws.com | EC2 instance profile for SSM |

---

### ECR Repository

```
Name:               empowered-sports-camp
URI:                024460283944.dkr.ecr.us-east-2.amazonaws.com/empowered-sports-camp
Tag Mutability:     MUTABLE
Scan on Push:       DISABLED
Encryption:         AES256
```

---

### KMS Key

```
Key ID:             1eda07b8-37be-4902-8d00-b7eeebe924cd
Alias:              alias/aws/codecommit
Manager:            AWS (service-managed)
State:              Enabled
Usage:              ENCRYPT_DECRYPT
Purpose:            Default CodeCommit encryption
```

---

### VPC & Networking

```
VPC:                vpc-07842bab165a9f149 (DEFAULT VPC)
CIDR:               172.31.0.0/16
Subnets:            3 (us-east-2a, 2b, 2c)
Internet Gateway:   Yes (default)
```

**Security Groups:**

| Name | ID | Inbound Rules |
|------|----|---------------|
| empowered-rds-sg | sg-0af4e550bd24bf8a9 | TCP 5432 from 0.0.0.0/0 |
| empowered-web-sg | sg-00ab9b4564412f203 | TCP 22,80,443,3000 from 0.0.0.0/0 |
| default | sg-032e5d09ca474776b | All traffic from self |

---

### SNS Topic

```
Topic:              amplify_codecommit_topic
ARN:                arn:aws:sns:us-east-2:024460283944:amplify_codecommit_topic
Subscriptions:      1 confirmed
Purpose:            Amplify/CodeCommit integration (likely unused)
```

---

## ARCHITECTURE DIAGRAM

```
                    ┌─────────────────────────┐
                    │   empoweredsportscamp.com│
                    │   (Route 53)            │
                    └────────┬────────────────┘
                             │ www CNAME
                             ▼
                    ┌─────────────────────────┐
                    │   Vercel (Hosting)       │
                    │   Next.js 16.0.8         │
                    │   empowered-sports-camp  │
                    └────┬──────────┬─────────┘
                         │          │
              ┌──────────┘          └──────────┐
              ▼                                ▼
    ┌──────────────────┐            ┌──────────────────┐
    │  RDS PostgreSQL  │            │   Cognito        │
    │  db.t3.micro     │            │   us-east-2_     │
    │  empowered-db    │            │   mNOJUg81i      │
    │  (us-east-2)     │            │   76 users       │
    └──────────────────┘            └──────────────────┘

              ┌──────────────────┐
              │  S3 Bucket       │
              │  empowered-      │
              │  sports-camp-new │
              │  (public read)   │
              └──────────────────┘

    External Services:
    ├── Stripe (payments)
    └── Resend (transactional email)
```

---

## COST BREAKDOWN — March 2026

| Service | Cost |
|---------|------|
| Amazon S3 | $0.34 |
| Amazon RDS | $0.004 |
| EC2 (EBS volume) | $0.0001 |
| Other | ~$0.00 |
| **Credits/Refunds** | **-$0.35** |
| **Net Total** | **~$0.00** |

Most services are within free tier. The stopped EC2 still incurs a small EBS storage charge.

---

## TOP 5 RECOMMENDED ACTIONS

1. **Lock down RDS** — Disable public access, restrict security group to Vercel's IP ranges or use a VPN/bastion. Enable encryption (requires snapshot + restore).
2. **Enable CloudTrail** — Critical for security auditing. At minimum, enable management events to an S3 bucket.
3. **Restrict IAM** — Create a dedicated policy for `empowered-app-user` with only the permissions the app needs (S3, Cognito, RDS). Remove AdministratorAccess.
4. **Enable Cognito MFA** — At least optional TOTP for admin accounts.
5. **Increase RDS backup retention** — Set to 7+ days. Enable deletion protection.
