# Click2IT - Domain & Hosting Platform

A high-performance Web Hosting, Cloud VPS, and Domain Registration & Management platform.

## Features
- **Shared Hosting & Cloud VPS:** Automated package selection, dynamic features, billing cycles, and comparison.
- **Domain Services:**
  - Real-time Domain Search & Bulk Search
  - Openprovider & BTCL (.bd) integration for registrations and transfers
  - Domain Locking, Security, and Nameserver Management
  - Automated & Manual Domain Renewals
- **Billing & Automation:**
  - Automated cPanel / WHM account provisioning & suspension
  - Openprovider automated registration and fulfillment
  - Integrated Manual & Gateway Payments (bKash, Nagad, SSLCommerz)
  - PDF Invoice generation and automated email notifications
- **Client Area:**
  - Manage active hosting accounts & domain portfolios
  - Client deposit wallet & transaction histories
  - Support ticket management with live status
- **Admin Dashboard:**
  - Comprehensive control over servers, plans, pricing tiers, applications, DNS, tickets, and user balances.

## Development Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Configure your `.env` (backend) and `.env.local` (frontend) with your Firebase credentials, WHM API token, Openprovider credentials, and email SMTP keys as demonstrated in `.env.example`.

3. **Run Dev Environment:**
   ```bash
   npm run dev
   ```
   - Frontend runs on `http://localhost:3001`
   - Backend API runs on `http://localhost:4001`

4. **Production Build & Verification:**
   ```bash
   npm run lint
   npm run build
   ```
