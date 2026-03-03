# Spec 06: Enterprise Features

## Overview
Enterprise tier enables self-hosted deployment, org-level SSO, fine-grained RBAC,
compliance audit logging, CI/CD API keys, and SCIM provisioning.

## Authentication: SSO via Auth.js v5

### Supported Providers
```typescript
// packages/server/src/auth/providers.ts
import { Auth } from "@auth/core";
import { SAML } from "@auth/saml-provider";    // Okta, Azure AD, PingIdentity
import { OIDC } from "@auth/oidc-provider";    // Generic OIDC
import MicrosoftEntraID from "@auth/microsoft-entra-id-provider";
import GoogleWorkspace from "@auth/google-provider";

export const authConfig = {
  providers: [
    SAML({ entityId: process.env.SAML_ENTITY_ID, ... }),
    OIDC({ issuer: process.env.OIDC_ISSUER, ... }),
    MicrosoftEntraID({ ... }),
    GoogleWorkspace({ ... }),
  ],
  callbacks: {
    jwt({ token, user }) {
      token.role = user.role;  // admin | manager | developer
      token.orgId = user.orgId;
      return token;
    }
  }
}
```

### JWT Structure
```json
{
  "sub": "usr_abc123",
  "email": "arunoday@company.com",
  "org_id": "org_xyz",
  "role": "admin",
  "scopes": ["read:team", "write:alerts", "manage:billing"],
  "exp": 1741000000
}
```

## RBAC (Role-Based Access Control)

### Role Definitions
```typescript
export const ROLES = {
  admin: {
    can: ["read:*", "write:*", "delete:*", "manage:team", "manage:billing"],
    description: "Full org access, billing, team management"
  },
  manager: {
    can: ["read:*", "write:alerts", "write:integrations", "read:cost"],
    description: "View all data, configure alerts, manage integrations"
  },
  developer: {
    can: ["read:own", "write:own", "read:team:aggregate"],
    description: "See own data + org aggregate (no individual peer data)"
  },
  readonly: {
    can: ["read:own"],
    description: "Read-only access to own data only"
  }
};
```

### Privacy Controls (critical for developer trust)
```
developer role CANNOT:
- See exact cost breakdown of another developer
- See commit-level attribution for another developer
- Export raw data

developer role CAN:
- See team aggregate (avg AI%, avg cost per commit)
- See leaderboard with rankings only (no exact numbers for others)
- See own full data
```

## SCIM 2.0 Provisioning
Enables automatic user sync from Okta/Azure AD/Google Workspace:
```
POST /scim/v2/Users          ← provision new developer
GET  /scim/v2/Users          ← list users
GET  /scim/v2/Users/:id      ← get user
PATCH /scim/v2/Users/:id     ← update user (role, active status)
DELETE /scim/v2/Users/:id    ← deprovision (keep data, revoke access)
GET  /scim/v2/Groups         ← list teams
POST /scim/v2/Groups         ← create team
PATCH /scim/v2/Groups/:id    ← add/remove members
```

## Audit Log

### Schema (PostgreSQL)
```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL,
  actor_id    TEXT NOT NULL,        -- user who performed action
  actor_email TEXT NOT NULL,
  action      TEXT NOT NULL,        -- "alert.created", "user.role_changed", etc.
  resource    TEXT,                 -- "alert:abc123", "user:xyz"
  metadata    JSONB,                -- action-specific details
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON audit_logs(org_id, created_at DESC);
CREATE INDEX ON audit_logs(actor_id, created_at DESC);
```

### Logged Actions
```
user.invited | user.role_changed | user.deprovisioned
alert.created | alert.triggered | alert.deleted
integration.connected | integration.disconnected
api_key.created | api_key.revoked
data.exported | data.deleted
sso.login | sso.login_failed
billing.plan_changed
```

### Audit Log API
```
GET /api/v1/audit-logs?limit=100&after=<cursor>&action=<filter>
GET /api/v1/audit-logs/export?from=<date>&to=<date>  ← CSV export for compliance
```

## API Keys (CI/CD Integration)

### API Key Structure
```
gitintel_live_<32-char-random>   ← production key
gitintel_test_<32-char-random>   ← test key (no rate limits)
```

### Key Scopes
```
read:stats        ← read team + developer stats
write:attribution ← push attribution logs from CI
write:cost        ← push cost sessions from CI
read:alerts       ← read alert configurations
manage:*          ← full programmatic access
```

### CI/CD Usage Example (GitHub Actions)
```yaml
- name: Push GitIntel Attribution
  run: |
    gitintel sync push       --api-key ${{ secrets.GITINTEL_API_KEY }}       --endpoint https://app.gitintel.com
```

## Self-Hosted Deployment

### Docker Compose Bundle
All services in a single `docker-compose.yml`:
```
services:
  gitintel-api:     bun server (port 3001)
  gitintel-web:     Next.js dashboard (port 3000)
  gitintel-otel:    OTel collector (port 4317)
  postgres:         PostgreSQL 16
  clickhouse:       ClickHouse (analytics queries)
  redis:            Redis (session cache, rate limiting)
  caddy:            Reverse proxy + auto-TLS
```

Single command deployment:
```bash
curl -fsSL https://get.gitintel.com/install.sh | bash
# OR
docker compose -f docker-compose.self-hosted.yml up -d
```

### Environment Configuration (.env)
```bash
# Required
DATABASE_URL=postgresql://gitintel:pass@postgres:5432/gitintel
CLICKHOUSE_URL=http://clickhouse:8123
NEXTAUTH_SECRET=<32-char-random>
NEXTAUTH_URL=https://gitintel.yourdomain.com

# SSO (pick one)
SAML_ENTITY_ID=https://gitintel.yourdomain.com
SAML_METADATA_URL=https://your-idp.com/metadata

# Optional
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
SMTP_HOST=smtp.yourdomain.com
```

### Helm Chart (Kubernetes)
```
infra/helm/gitintel/
├── Chart.yaml
├── values.yaml          ← all configurable values
├── templates/
│   ├── api-deployment.yaml
│   ├── web-deployment.yaml
│   ├── otel-deployment.yaml
│   ├── postgres-statefulset.yaml
│   ├── clickhouse-statefulset.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   └── secrets.yaml
└── values-prod.yaml     ← production overrides
```

Install:
```bash
helm repo add gitintel https://charts.gitintel.com
helm install gitintel gitintel/gitintel -f values-prod.yaml
```

## Data Residency & Compliance
- All data stored in customer-controlled infrastructure (self-hosted)
- No telemetry sent to GitIntel HQ without explicit opt-in
- Encryption at rest: AES-256 (PostgreSQL) + ClickHouse native encryption
- Encryption in transit: TLS 1.3 enforced
- GDPR: right to deletion via `gitintel admin purge --user <email>`
- SOC2 Type II readiness: audit logs + access controls documented
