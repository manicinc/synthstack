# Project Members and Invitations System

## Overview
Guest users can now invite and manage team members for their projects. The system provides comprehensive invitation management with role-based permissions.

## What Was Implemented

### 1. Database Schema (Migration 041)

#### Tables Created:
- **project_members**: Tracks team members assigned to projects
  - Stores user-project relationships with roles (owner, admin, member, viewer)
  - JSONB permissions for granular access control
  - Status tracking (active, inactive, removed)

- **project_invitations**: Manages pending invitations
  - Token-based invitation system
  - 7-day expiration by default
  - Status tracking (pending, accepted, declined, expired)
  - Links invitation to project and inviter

#### Automatic Features:
- **Auto-add Owner**: Project owners are automatically added as members when a project is created
- **Backfill**: Existing projects are updated to include their owners as members
- **Helper Functions**:
  - `is_project_member(project_id, user_id)` - Check if user is an active member
  - `get_project_role(project_id, user_id)` - Get user's role in project

### 2. Directus Permissions (v11 Policy-Based)

Created "Guest User Policy" with permissions for:
- **project_members collection**: Create, read, update, delete
- **project_invitations collection**: Create, read, update, delete
- **projects collection**: Updated to include projects where user is a member

Permissions ensure:
- Users can only see members/invitations for projects they own or are members of
- Only project owners can invite new members
- Project owners cannot be removed
- Invitations can only be cancelled by the person who sent them

### 3. API Endpoints

New routes at `/api/v1/projects/:projectId/members` and `/api/v1/invitations`:

#### GET /projects/:projectId/members
- List all active members of a project
- Returns user details (email, name) for each member
- Requires authentication
- Accessible to project owner and members

#### POST /projects/:projectId/members/invite
- Invite a new member by email
- Set role (member, admin, viewer) and permissions
- Generates unique invitation token
- Only accessible to project owner
- Prevents duplicate invitations
- Returns invitation details (includes token in development mode)

#### GET /projects/:projectId/invitations
- List all invitations for a project (pending, accepted, declined)
- Only accessible to project owner
- Sorted by creation date (newest first)

#### POST /invitations/:token/accept
- Accept an invitation using the unique token
- Verifies invitation is for the authenticated user's email
- Checks expiration
- Adds user as project member
- Updates invitation status to 'accepted'

#### DELETE /invitations/:invitationId
- Cancel a pending invitation
- Only the person who sent the invitation can cancel it
- Removes the invitation from the database

#### DELETE /projects/:projectId/members/:memberId
- Remove a member from a project
- Only accessible to project owner
- Cannot remove the project owner
- Sets member status to 'removed'

### 4. Security Features

- **Authentication Required**: All endpoints require valid JWT token
- **Owner Verification**: Only project owners can invite/remove members
- **Email Matching**: Users can only accept invitations sent to their email
- **Token Security**: 32-byte random hex tokens for invitations
- **Expiration**: Invitations expire after 7 days
- **Role Protection**: Project owners cannot be removed from their projects
- **Permission Filtering**: Users can only see projects they own or are members of

## Database Verification

Migration successfully applied:
- ✅ `project_members` table created with indexes
- ✅ `project_invitations` table created with indexes
- ✅ Triggers created for auto-adding owners and updating timestamps
- ✅ Helper functions created
- ✅ Guest User Policy created
- ✅ 9 permissions created (4 for project_invitations, 4 for project_members, 1 for projects)
- ✅ Guest User role linked to policy via `directus_access`

## API Routes Registered

New routes available at:
- `GET    /api/v1/projects/:projectId/members`
- `POST   /api/v1/projects/:projectId/members/invite`
- `GET    /api/v1/projects/:projectId/invitations`
- `POST   /api/v1/invitations/:token/accept`
- `DELETE /api/v1/invitations/:invitationId`
- `DELETE /api/v1/projects/:projectId/members/:memberId`

## Next Steps (Future Implementation)

1. **Email Notifications**: Send actual invitation emails with tokens
2. **Frontend UI**:
   - Project members list component
   - Invite member dialog
   - Invitation acceptance page
   - Member management interface
3. **Role Management**: Update member roles and permissions
4. **Activity Log**: Track member additions/removals
5. **Bulk Invitations**: Invite multiple users at once
6. **Invitation Templates**: Pre-defined invitation messages

## Testing

To test the implementation:

1. **Create a project** (as a guest user)
2. **Invite a member**:
   ```bash
   POST /api/v1/projects/{projectId}/members/invite
   {
     "email": "member@example.com",
     "role": "member"
   }
   ```
3. **List invitations**:
   ```bash
   GET /api/v1/projects/{projectId}/invitations
   ```
4. **Accept invitation** (as the invited user):
   ```bash
   POST /api/v1/invitations/{token}/accept
   ```
5. **List members**:
   ```bash
   GET /api/v1/projects/{projectId}/members
   ```

## Technical Notes

- **Directus v11 Compatibility**: Migration uses policy-based permissions (not role-based like v10)
- **JSONB Permissions**: Flexible permission structure allows future extensions
- **Token Generation**: Uses crypto.randomBytes(32) for secure tokens
- **Cascading Deletes**: Removing a project automatically removes all members and invitations
- **Unique Constraints**: Prevents duplicate members and duplicate pending invitations
- **Development Mode**: Invitation tokens are returned in API response for easier testing

## Files Modified

1. `/services/directus/migrations/041_project_members_invitations.sql` - Database migration
2. `/packages/api-gateway/src/routes/project-members.ts` - New API routes
3. `/packages/api-gateway/src/index.ts` - Route registration

## Migration Status

Migration ID: `041_project_members_invitations.sql`
Status: ✅ Successfully Applied
Applied At: 2025-12-19 05:43:31 UTC
