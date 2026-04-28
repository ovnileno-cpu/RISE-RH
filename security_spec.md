# RISE HR Security Specification

## Data Invariants
- An employee record cannot exist without a matching Auth UID.
- A leave request must belong to a valid employee.
- A candidate must be linked to a valid Job Offer.
- Only admins or managers can change recruitment status.
- Employees can only see their own payroll and evaluations.

## The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Attempt to create a leave request with another user's `employeeId`.
2. **Privilege Escalation**: Attempt to update a user's `role` to 'admin' from a non-admin account.
3. **Ghost Field Injection**: Adding `isVerified: true` to an employee profile.
4. **ID Poisoning**: Using a 1MB string as a document ID.
5. **PII Blanket Read**: Authenticated user trying to `get` all documents in the `employees` collection.
6. **State Shortcut**: Updating a leave status from 'pending' directly to 'approved_rh' bypassing manager.
7. **Orphaned Record**: Creating a candidate for a non-existent `jobOfferId`.
8. **Resource Exhaustion**: Sending a 1MB string in the `reason` field of a leave request.
9. **Timestamp Spoofing**: Sending a manual `createdAt` in the past.
10. **Admin Lockout**: Attempting to delete the last admin record (handled by logic).
11. **Negative Salary**: Submitting a payroll with a negative `netSalary`.
12. **Cross-Tenant Access**: (If multi-tenant, but here it's single company).

## Red Team Audit Pass Criteria
- All write operations must use `isValid[Entity]()`.
- `affectedKeys().hasOnly()` must be used for partial updates.
- `isAuthenticated()` is the minimum gate, followed by specific identity checks.
- Default deny `match /{document=**} { allow read, write: if false; }` must be present.
