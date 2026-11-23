# Security Specification (Firestore Rules TDD)

## 1. Data Invariants
1. **Workspace Isolation**: A workspace document at `/workspaces/{workspaceId}` can only be read or mutated by the authenticated, email-verified user whose `request.auth.uid == workspaceId` and `data.ownerId == request.auth.uid`.
2. **Master Gate for Students**: A student document at `/workspaces/{workspaceId}/students/{studentId}` can only be accessed if the parent `/workspaces/{workspaceId}` exists and its `ownerId == request.auth.uid` (verified via `get()`), and `student.ownerId == request.auth.uid`.
3. **Strict Field Allowlisting & Types**: Unknown/ghost fields (`isAdmin`, `role`, etc.) are rejected via `keys().hasAll` + `keys().hasOnly` on create and `affectedKeys().hasOnly` on update.
4. **Temporal & Ownership Immutability**: `createdAt` and `ownerId` are enforced on create (`createdAt == request.time`, `ownerId == request.auth.uid`) and cannot be modified on update; `updatedAt` must equal `request.time`.
5. **Size & Format Bounds**: All IDs match `^[a-zA-Z0-9_-]+$` (`<= 128` chars), strings and lists have strict `.size()` limits, and `ruang` / `orderIndex` are bounded integers.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read or write on `/workspaces/{uid}`.
2. Authenticated user with `email_verified: false` attempting to create/update `/workspaces/{uid}`.
3. Spoofed `ownerId` (different from `request.auth.uid`) on workspace create.
4. Workspace `workspaceId` not matching `request.auth.uid`.
5. Ghost field injection (`{ ..., isAdmin: true }`) on workspace create or update.
6. Client-forged `createdAt` or `updatedAt` timestamp not equal to `request.time`.
7. Mutating immutable `ownerId` or `createdAt` on workspace or student update.
8. Oversized `tracks` list (`> 20` items) or non-string first element in `tracks`.
9. Student creation under another user's `/workspaces/{otherUid}/students/{id}` even if `ownerId == request.auth.uid`.
10. Invalid path ID (`studentId` containing `.` or `> 128` chars).
11. Student `name` empty (`""`) or exceeding `120` characters, or `photoDataUrl` exceeding `350000` characters.
12. Cross-user `list` query on `/workspaces` or `/workspaces/{otherUid}/students`.
