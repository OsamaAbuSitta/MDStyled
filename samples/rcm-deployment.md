---
mdstyled:
  styles:
    - ./rcm-deployment.css
  scripts:
    - ./rcm-deployment.js
  mode: safe
---

<!-- @page: technical-doc -->

<!-- .cover -->
# RCM Deployment Plan

This document explains the deployment process for the RCM platform.

## Overview

The RCM deployment pipeline consists of three stages:

| Stage | Duration | Approval |
|---|---|---|
| Build | 5 min | Auto |
| Staging | 15 min | Team Lead |
| Production | 10 min | Manager |

<!-- @section: service -->
## Billing API

The billing service handles payment processing and invoicing.

### Configuration

| Key | Value |
|---|---|
| Port | 5001 |
| Environment | Production |
| Timeout | 30s |

### Endpoints

<!-- .endpoint -->
`POST /api/billing/charge` — Process a payment.

<!-- .endpoint -->
`GET /api/billing/invoices` — List invoices.

<!-- .warning -->
> Ensure the database migration runs before deploying this service.

## Claim API

The claim service handles insurance claim submissions.

### Configuration

<!-- #claim-config [data-owner=rcm] -->
| Key | Value |
|---|---|
| Port | 5002 |
| Max File Size | 10MB |

<!-- .warning .critical -->
> Claims processing must not exceed 5 seconds under load.

## Monitoring

All services report to the central monitoring dashboard.

<!-- .note -->
Refer to the [operations runbook](./runbook.md) for incident response procedures.
