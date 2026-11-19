# UCWF Security Rules & Schema Specification

1. **Default Deny Safety Net:** `match /{document=**} { allow read, write: if false; }` blocks all undeclared paths.
2. **Strict Path & Schema Validation:** Every write (`create` and `update`) across all 15 UCWF portal collections (`users`, `members`, `wallets`, `payment_requests`, `withdrawals`, `transactions`, `payout_records`, `payout_logs`, `spends`, `expenses`, `events`, `daily_closings`, `media_submissions`, `media_gallery`, `settings`) is validated with strict `hasAll`, `hasOnly`, data types, ID matching (`data.uid == userId` / `data.id == docId`), enum constraints, and string/numeric bounds.
3. **Immutable Identifiers:** Document `uid` / `id` / `userId` cannot be mutated on `update`.
4. **Admins Registry:** `/admins/{adminId}` remains restricted to verified Firebase Auth admin accounts.
5. **Automatic Portal Sync:** Because the UCWF portal uses custom portal authentication (`admin` / Member ID + password), schema-validated collection rules allow automatic real-time cross-device Cloud Firestore syncing without requiring personal Gmail sign-in.
