# Procify AI — Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Ownership**: Every document in `documents`, `workflows`, `tasks`, `calendarEvents`, `notifications`, `activities`, and `integrations` MUST have `userId == request.auth.uid` on both creation and read/list/update/delete.
2. **Email Verification Gate**: All authenticated writes require `request.auth.token.email_verified == true`.
3. **Referential Integrity**: Every `tasks/{taskId}` creation MUST verify via `exists()` and `get()` that `workflowId` points to an existing `workflows/{workflowId}` document owned by `request.auth.uid`.
4. **Immutable Ownership & Timestamps**: `userId`, `id`, and `createdAt` are immutable after creation. All `createdAt` and `updatedAt` timestamps MUST equal `request.time`.
5. **Terminal State Locking**: Archived workflows (`status == 'archived'`) cannot be modified further. Completed workflows (`status == 'completed'`) can only transition to `'archived'`.
6. **PII Isolation**: User profile documents in `users/{userId}` (containing `email`, `fullName`) are strictly readable and writable only by `request.auth.uid == userId`.
7. **Shadow Field & Payload Bounds**: Every collection enforces `keys().hasAll(...)`, `keys().hasOnly(...)`, `affectedKeys().hasOnly(...)`, `isValidId(id)`, string `.size()` bounds, and bounded list lengths.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Reading `/workflows/wf1` with `auth == null`.
2. **Unverified Email Write**: Creating `/documents/doc1` with `email_verified == false`.
3. **Cross-Tenant Identity Spoof**: Creating `/workflows/wf1` with `userId: "other-uid"`.
4. **Cross-Tenant List Query**: Listing `/tasks` without filtering to `request.auth.uid` or attempting to read another user's task.
5. **Shadow Field Injection on Create**: Creating `/workflows/wf1` with extra key `isAdmin: true`.
6. **Shadow Update Injection**: Updating `/tasks/t1` with `affectedKeys` containing `userId` or `createdAt`.
7. **Orphaned Task Creation**: Creating `/tasks/t1` with `workflowId: "nonexistent-wf"`.
8. **Cross-Tenant Task Attachment**: Creating `/tasks/t1` referencing another user's `workflowId`.
9. **ID Poisoning**: Creating `/documents/<1500-char-junk>` or `/documents/bad$id`.
10. **Client Timestamp Forgery**: Creating `/workflows/wf1` with a backdated `createdAt` not equal to `request.time`.
11. **Terminal State Mutation**: Updating a workflow whose existing `status` is `'archived'`.
12. **PII Leak Attempt**: Reading `/users/otherUserUid` as a different signed-in user.
