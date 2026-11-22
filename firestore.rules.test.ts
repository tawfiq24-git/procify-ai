/**
 * Security Rule Verification Matrix for Procify AI ("Dirty Dozen" Payloads)
 * Maps each adversarial payload to the Firestore security gate that rejects it.
 */

export interface SecurityTestCase {
  id: string;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
  enforcingGate: string;
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 'DD-01',
    name: 'Unauthenticated read of workflows',
    collection: 'workflows',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isVerifiedUser() && existing().userId == request.auth.uid',
  },
  {
    id: 'DD-02',
    name: 'Unverified email user write to documents',
    collection: 'documents',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isVerifiedUser() requires request.auth.token.email_verified == true',
  },
  {
    id: 'DD-03',
    name: 'Cross-tenant userId spoofing on workflow create',
    collection: 'workflows',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().userId == request.auth.uid',
  },
  {
    id: 'DD-04',
    name: 'Cross-tenant list query scraping on tasks',
    collection: 'tasks',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'allow list: if isVerifiedUser() && resource.data.userId == request.auth.uid',
  },
  {
    id: 'DD-05',
    name: 'Shadow field injection (isAdmin: true) on workflow create',
    collection: 'workflows',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'data.keys().hasOnly([...])',
  },
  {
    id: 'DD-06',
    name: 'Immortal field mutation (userId/createdAt) on task update',
    collection: 'tasks',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().userId == existing().userId && incoming().createdAt == existing().createdAt && affectedKeys().hasOnly(...)',
  },
  {
    id: 'DD-07',
    name: 'Orphaned task creation with nonexistent workflowId',
    collection: 'tasks',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'exists(/databases/$(database)/documents/workflows/$(incoming().workflowId))',
  },
  {
    id: 'DD-08',
    name: 'Attaching task to another user workflow',
    collection: 'tasks',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'get(/databases/$(database)/documents/workflows/$(incoming().workflowId)).data.userId == request.auth.uid',
  },
  {
    id: 'DD-09',
    name: 'Document ID poisoning (>128 chars or invalid characters)',
    collection: 'documents',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isValidId(documentId)',
  },
  {
    id: 'DD-10',
    name: 'Client timestamp forgery on create',
    collection: 'workflows',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().createdAt == request.time && incoming().updatedAt == request.time',
  },
  {
    id: 'DD-11',
    name: 'Mutating archived (terminal) workflow',
    collection: 'workflows',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'existing().status != "archived"',
  },
  {
    id: 'DD-12',
    name: 'PII cross-user read on users/{userId}',
    collection: 'users',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isOwner(userId)',
  },
];
