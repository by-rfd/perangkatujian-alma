/**
 * Firestore Security Rules Specification & Unit Test Suite
 *
 * Run against Firebase Emulator Suite when `@firebase/rules-unit-testing` is installed.
 * Covers all 12 "Dirty Dozen" attack vectors and positive owner workflows from `security_spec.md`.
 */

export const SECURITY_TEST_CASES = [
  // Positive cases
  {
    name: 'Verified owner can create own workspace with serverTimestamp',
    path: '/workspaces/{uid}',
    expected: 'ALLOW',
  },
  {
    name: 'Verified owner can update mutable workspace fields while preserving ownerId and createdAt',
    path: '/workspaces/{uid}',
    expected: 'ALLOW',
  },
  {
    name: 'Verified owner can create, list (with ownerId filter), update, and delete students under own workspace',
    path: '/workspaces/{uid}/students/{studentId}',
    expected: 'ALLOW',
  },

  // Dirty Dozen negative cases
  {
    name: '1. Unauthenticated read or write on /workspaces/{uid}',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '2. Authenticated user with email_verified=false cannot create or update /workspaces/{uid}',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '3. Spoofed ownerId different from request.auth.uid on workspace create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. Workspace workspaceId not matching request.auth.uid',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Ghost field injection (e.g. isAdmin: true) on workspace create or update',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Client-forged createdAt or updatedAt not equal to request.time',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. Mutating immutable ownerId or createdAt on workspace or student update',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '8. Oversized tracks list (> 20 items) or non-string first element',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '9. Student creation under another user workspace even if ownerId == request.auth.uid',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Invalid path ID containing disallowed characters or > 128 chars',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. Empty student name, > 120 chars name, or photoDataUrl > 350000 chars',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Cross-user list query on /workspaces or /workspaces/{otherUid}/students',
    expected: 'PERMISSION_DENIED',
  },
] as const;
