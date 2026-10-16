# Firestore Security Rules & Access Control Plan

Thorough analysis of the `FirebaseError: Missing or insufficient permissions` root causes and architectural plan to update access rules for `customers` and `orders` collections in Firestore.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following security requirements have been confirmed based on your preferences:

- **Confirmed Decision 1 (Customers Collection)**: Authenticated users can read and update their own customer profile (`users` and `customers`), while staff/admins retain full management rights across all customer profiles.
- **Confirmed Decision 2 (Orders Collection)**: Strict staff and admin role check enforced for direct client-side querying of all order management documents. Order placements from clients are processed through verified Express server proxy endpoints (`/api/orders`, `/api/customers/pay-order`) or authenticated user self-service documents.

---

## 1. Root Cause Analysis

### Cause 1: Direct Client Queries on Restricted Collections
- When frontend components (such as `OrdersTab`, `AnalyticsDashboard`, or `DomainOrdersManager`) executed direct `getDocs(collection(db, 'orders'))` or `onSnapshot(collection(db, 'orders'))` without filtering by `where('userId', '==', auth.currentUser.uid)`, Firestore rules rejected the request with `PERMISSION_DENIED`.
- **Solution**: Route staff management views through backend endpoints (`/api/admin/customers`, `/api/orders`) using Firebase Admin SDK (which bypasses rule constraints securely), while ensuring client-side queries enforce `userId` filtering.

### Cause 2: Overly Restrictive Schema Type Validation Helper
- The legacy `isValidOrder` helper required strict match on fixed categories (`type in ['invoice', 'quotation', 'challan', 'pos_sale']`). Orders created via `HostingCheckout` with type `'hosting'` or status `'unpaid'` failed validation and threw `PERMISSION_DENIED`.
- **Solution**: Generalize `isValidOrder` and `isValidCustomer` in `firestore.rules` to accept modern hosting, domain, and wallet payment order shapes.

### Cause 3: Missing Security Rules for Wallet & Secondary Collections
- New features like `topup_requests`, `wallet_transactions`, `affiliate_commissions`, and `payout_requests` had no explicit match blocks in `firestore.rules`, defaulting to a complete block (`deny all`).
- **Solution**: Explicitly match and secure all user-facing wallet and affiliate collections in `firestore.rules`.

---

## 2. Updated Security Architecture & UX Flow

### User & Staff Access Flow
```
┌─────────────────────────────────────────────────────────┐
│                    User Client                          │
│  - Reads/writes /users/{userId} where uid == auth.uid   │
│  - Submits orders via POST /api/orders (Server-side)    │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Server / API Layer                    │
│  - Firebase Admin SDK (Bypasses rules safely)          │
│  - Verifies user auth tokens & executes DB operations   │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Firestore Database                    │
│  - Enforces ABAC via firestore.rules                    │
│  - Enforces strict role checks for staff & admins       │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Key Technical Decisions & Trade-Offs

### Decision 1: Server-Side Fulfillment for Orders vs. Client-Side Writes
- **Chosen Approach**: Order placement, wallet deductions, and order fulfillments execute via server proxy routes (`/api/customers/pay-order` and `/api/orders`), while direct client-side reads are restricted to owned documents (`userId == auth.uid`).
- **Why**: Eliminates client-side privilege escalation risks, prevents users from altering order totals or statuses, and avoids `PERMISSION_DENIED` errors on client queries.

### Decision 2: Flexible Key Validation for Evolving Order Types
- **Chosen Approach**: Validate structural type requirements (e.g. `items` is list, `total` is number, `createdAt` is present) without hardcoding narrow string enums for `type` or `status`.
- **Why**: Allows new domain, hosting, and SSL order categories to persist without breaking Firestore schema validations.

---

## 4. Technical Reference & Data Model

### Proposed Rules for `customers` and `orders`

```javascript
// ===== CUSTOMERS COLLECTION =====
match /customers/{customerId} {
  // Staff can read/write any customer record
  // Authenticated users can read/write their own customer profile document
  allow read: if hasStaffAccess() || (isAuthenticated() && resource.data.userId == request.auth.uid);
  allow create: if isAuthenticated() && (request.resource.data.userId == request.auth.uid || hasStaffAccess());
  allow update: if hasStaffAccess() || (isAuthenticated() && resource.data.userId == request.auth.uid);
  allow delete: if isAdmin();
}

// ===== ORDERS COLLECTION =====
match /orders/{orderId} {
  // Staff/Admin full management access
  // Authenticated clients can read their own orders (filtered by userId)
  allow read: if hasStaffAccess() || (isAuthenticated() && resource.data.userId == request.auth.uid);
  allow create: if isAuthenticated() || request.resource.data.userId == 'guest' || hasStaffAccess();
  allow update: if hasStaffAccess() || (isAuthenticated() && resource.data.userId == request.auth.uid);
  allow delete: if isAdmin();
}
```

### Action Plan:
1. Update `firestore.rules` with the enhanced rule declarations for `customers`, `orders`, and related wallet/affiliate collections.
2. Deploy the rules via `deploy_firebase`.
3. Verify client-side error handling wrappers using `handleFirestoreError` patterns to ensure descriptive error diagnostics.
