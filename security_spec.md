# Security Specification — UCWF Firestore Rules (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny & Catch-All Guard:** Every unspecified path under `/databases/{database}/documents` is strictly denied (`allow read, write: if false;`).
2. **PII Isolation:** Sensitive member documents (`/users/{userId}`, `/members/{userId}`, `/wallets/{userId}`) and private financial ledgers (`/withdrawals`, `/transactions`, `/payment_requests`) are never exposed to unauthenticated blanket list queries. Only the record owner (`userId == request.auth.uid`) or a verified Admin (`isAdmin()`) may read or list them.
3. **Privilege Escalation Prevention:** A member cannot assign themselves `role: 'admin'`, `is_admin: true`, or alter wallet counters (`walletBalance`, `totalEarned`) on create or profile update without Admin privileges.
4. **Admin Bootstrapping & Verified Email Gate:** Admin privilege requires either verified runtime admin email (`request.auth.token.email == 'singhshriyansh51@gmail.com' && request.auth.token.email_verified == true`) or membership in `/admins/{uid}` with `email_verified == true`.
5. **Path Variable & Payload Size Hardening:** Every single-document ID (`isValidId`) matches `^[a-zA-Z0-9_\\-]+$` (`<= 128` chars), and every string/map field enforces `.size()` limits to prevent 1MB exhaustion attacks.
6. **Immutability & Terminal State Locking:** Owners cannot overwrite `uid`, `createdAt`, or modify `withdrawals`/`payment_requests` once transitioned to `'approved'`, `'paid'`, or `'rejected'` (only Admin can override).

## 2. The "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Shadow Field Injection on User Create:** `{ "uid": "u1", "memberId": "UCWF-9999", "name": "Attacker", "status": "active", "is_admin": true, "ghost": 1 }` -> Denied (`keys().hasOnly(...)` + `!is_admin`).
2. **Role Escalation Update by Owner:** Updating `/users/u1` with `{ "role": "admin" }` -> Denied (`affectedKeys().hasOnly(...)`).
3. **Wallet Balance Tampering by Owner:** Updating `/users/u1` with `{ "walletBalance": 999999 }` -> Denied (`affectedKeys().hasOnly(...)`).
4. **Unverified Admin Email Spoof:** Auth token `{ "email": "singhshriyansh51@gmail.com", "email_verified": false }` -> Denied (`email_verified == true` check).
5. **Cross-User PII Read:** User A reading `/users/userB` -> Denied (`!isOwner && !isAdmin`).
6. **Blanket User List Scraping:** Unauthenticated or non-admin `list` on `/users` -> Denied (`isOwner` or `isAdmin`).
7. **ID Poisoning:** Creating `/spends/../../etc/passwd` or 500-char ID -> Denied (`isValidId`).
8. **Invalid Amount Negative Injection:** Creating `/withdrawals/w1` with `{ "amount": -5000 }` -> Denied (`amount > 0`).
9. **Terminal State Mutation by Non-Admin:** User updating `/withdrawals/w1` from `status: "paid"` back to `"pending"` -> Denied (`existing().status == 'pending'`).
10. **Forged Transaction Ownership:** Creating `/transactions/t1` with `userId: "victim_uid"` while signed in as `"attacker_uid"` -> Denied (`incoming().userId == request.auth.uid || isAdmin()`).
11. **Oversized String Exhaustion:** Creating `/spends/s1` with 2MB `description` -> Denied (`description.size() <= 1000`).
12. **Unauthenticated Settings Modification:** Updating `/settings/levelRates` without verified Admin auth -> Denied (`isAdmin()`).
