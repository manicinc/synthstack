-- Migration: 081_client_portal_permissions.sql
-- Description: Create Client Portal User role with comprehensive RLS permissions
-- Dependencies: 028_organizations_contacts.sql, 060_project_client_portal.sql, 062_conversations.sql

-- =============================================================================
-- CREATE CLIENT PORTAL ROLE & POLICY
-- =============================================================================

-- Create Client Portal User role
DO $$
DECLARE
  portal_role_id UUID;
  portal_policy_id UUID;
BEGIN
  -- Create role
  INSERT INTO directus_roles (id, name, icon, description)
  VALUES (
    gen_random_uuid(),
    'Client Portal User',
    'people_outline',
    'Client users who can access their projects, invoices, and conversations'
  ) RETURNING id INTO portal_role_id;

  -- Create policy
  INSERT INTO directus_policies (id, name, icon, description, admin_access, app_access)
  VALUES (
    gen_random_uuid(),
    'Client Portal Access',
    'lock_person',
    'Access to client portal collections with data isolation',
    false,
    true
  ) RETURNING id INTO portal_policy_id;

  -- Link policy to role
  INSERT INTO directus_access (id, role, policy, sort)
  VALUES (
    gen_random_uuid(),
    portal_role_id,
    portal_policy_id,
    1
  );

  -- =============================================================================
  -- ORGANIZATIONS & CONTACTS (Read Own Org Data)
  -- =============================================================================

  -- READ own organization
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'organizations',
    'read',
    '{"id":{"_eq":"$CURRENT_USER.organization_id"}}',
    'id,name,billing_email,phone,website,logo,brand_color',
    portal_policy_id
  );

  -- READ contacts in same organization
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'contacts',
    'read',
    '{"organization_id":{"_eq":"$CURRENT_USER.organization_id"}}',
    'id,first_name,last_name,email,phone,job_title,avatar',
    portal_policy_id
  );

  -- UPDATE own contact profile
  INSERT INTO directus_permissions (collection, action, permissions, validation, fields, policy)
  VALUES (
    'contacts',
    'update',
    '{"id":{"_eq":"$CURRENT_USER.contact_id"}}',
    '{}',
    'first_name,last_name,phone,job_title,avatar,email',
    portal_policy_id
  );

  -- =============================================================================
  -- PROJECTS (Via project_contacts Junction)
  -- =============================================================================

  -- READ projects where contact is in project_contacts
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'projects',
    'read',
    '{"_and":[
      {"is_client_visible":{"_eq":true}},
      {"project_contacts":{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}}
    ]}',
    '*',
    portal_policy_id
  );

  -- READ os_projects where contact is in os_project_contacts
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'os_projects',
    'read',
    '{"os_project_contacts":{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}}',
    '*',
    portal_policy_id
  );

  -- READ project_contacts for accessible projects
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'project_contacts',
    'read',
    '{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}',
    '*',
    portal_policy_id
  );

  -- READ os_project_contacts
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'os_project_contacts',
    'read',
    '{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}',
    '*',
    portal_policy_id
  );

  -- =============================================================================
  -- TASKS (Client-Visible Only)
  -- =============================================================================

  -- READ todos where visible to client AND has project access
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'todos',
    'read',
    '{"_and":[
      {"is_visible_to_client":{"_eq":true}},
      {"status":{"_nin":["completed","cancelled"]}},
      {"project_id":{"project_contacts":{"_and":[
        {"contact_id":{"_eq":"$CURRENT_USER.contact_id"}},
        {"can_view_tasks":{"_eq":true}}
      ]}}}
    ]}',
    'id,title,description,status,priority,due_date,responsibility,start_date,project_id,client_task_details',
    portal_policy_id
  );

  -- READ os_tasks where visible to client
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'os_tasks',
    'read',
    '{"_and":[
      {"is_visible_to_client":{"_eq":true}},
      {"project":{"os_project_contacts":{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}}}
    ]}',
    'id,name,description,due_date,status,client_task_details,embed_url',
    portal_policy_id
  );

  -- =============================================================================
  -- INVOICES (Organization-Scoped)
  -- =============================================================================

  -- READ os_invoices for own organization
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'os_invoices',
    'read',
    '{"_or":[
      {"organization":{"_eq":"$CURRENT_USER.organization_id"}},
      {"contact":{"_eq":"$CURRENT_USER.contact_id"}}
    ]}',
    'id,invoice_number,status,issue_date,due_date,subtotal,total_tax,total,amount_paid,amount_due,organization,contact',
    portal_policy_id
  );

  -- READ os_invoice_items for accessible invoices
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'os_invoice_items',
    'read',
    '{"invoice":{"_or":[
      {"organization":{"_eq":"$CURRENT_USER.organization_id"}},
      {"contact":{"_eq":"$CURRENT_USER.contact_id"}}
    ]}}',
    'id,invoice,description,quantity,unit_price,line_amount,tax_amount,tax_rate,total,sort',
    portal_policy_id
  );

  -- READ os_payments for own invoices
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'os_payments',
    'read',
    '{"invoice":{"_or":[
      {"organization":{"_eq":"$CURRENT_USER.organization_id"}},
      {"contact":{"_eq":"$CURRENT_USER.contact_id"}}
    ]}}',
    'id,invoice,amount,payment_date,payment_method,reference,status',
    portal_policy_id
  );

  -- =============================================================================
  -- CONVERSATIONS & MESSAGES (Participant-Based)
  -- =============================================================================

  -- READ conversations where contact is participant
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'conversations',
    'read',
    '{"conversation_participants":{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}}',
    '*',
    portal_policy_id
  );

  -- READ messages in accessible conversations (exclude internal notes)
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'messages',
    'read',
    '{"_and":[
      {"conversation_id":{"conversation_participants":{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}}},
      {"is_internal_note":{"_eq":false}}
    ]}',
    'id,conversation_id,text,sender_name,sender_email,message_type,date_created,is_read',
    portal_policy_id
  );

  -- CREATE messages in own conversations
  INSERT INTO directus_permissions (collection, action, permissions, validation, fields, policy)
  VALUES (
    'messages',
    'create',
    '{"conversation_id":{"conversation_participants":{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}}}',
    '{"conversation_id":{"conversation_participants":{"_and":[
      {"contact_id":{"_eq":"$CURRENT_USER.contact_id"}},
      {"can_send_messages":{"_eq":true}}
    ]}}}',
    'conversation_id,text,contact_id',
    portal_policy_id
  );

  -- UPDATE own messages (mark as read)
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'messages',
    'update',
    '{"conversation_id":{"conversation_participants":{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}}}',
    'is_read,read_at',
    portal_policy_id
  );

  -- READ conversation_participants for own conversations
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'conversation_participants',
    'read',
    '{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}',
    '*',
    portal_policy_id
  );

  -- =============================================================================
  -- FILES (Project-Scoped)
  -- =============================================================================

  -- READ files attached to accessible projects
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'directus_files',
    'read',
    '{"_or":[
      {"project_files":{"_and":[
        {"is_client_visible":{"_eq":true}},
        {"project_id":{"project_contacts":{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}}}
      ]}},
      {"message_attachments":{"message_id":{"conversation_id":{"conversation_participants":{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}}}}}
    ]}',
    '*',
    portal_policy_id
  );

  -- UPLOAD files to own conversations (if permission granted)
  INSERT INTO directus_permissions (collection, action, permissions, validation, fields, policy)
  VALUES (
    'directus_files',
    'create',
    '{}',
    '{}',
    '*',
    portal_policy_id
  );

  -- =============================================================================
  -- PROPOSALS (If Accessible via Contacts)
  -- =============================================================================

  -- READ os_proposals linked to contact
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'os_proposals',
    'read',
    '{"os_proposal_contacts":{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}}',
    '*',
    portal_policy_id
  );

  -- READ proposal blocks for accessible proposals
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'os_proposal_blocks',
    'read',
    '{"proposal":{"os_proposal_contacts":{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}}}',
    '*',
    portal_policy_id
  );

  -- READ os_proposal_approvals
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'os_proposal_approvals',
    'read',
    '{"proposal":{"os_proposal_contacts":{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}}}',
    '*',
    portal_policy_id
  );

  -- UPDATE proposal approvals (sign/approve)
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'os_proposal_approvals',
    'update',
    '{"_and":[
      {"proposal":{"os_proposal_contacts":{"contact_id":{"_eq":"$CURRENT_USER.contact_id"}}}},
      {"contact":{"_eq":"$CURRENT_USER.contact_id"}}
    ]}',
    'status,signature,signed_at,comments',
    portal_policy_id
  );

  -- =============================================================================
  -- HELP CENTER (Public Read Access)
  -- =============================================================================

  -- READ help_collections
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'help_collections',
    'read',
    '{"status":{"_eq":"published"}}',
    '*',
    portal_policy_id
  );

  -- READ help_articles
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'help_articles',
    'read',
    '{"status":{"_eq":"published"}}',
    '*',
    portal_policy_id
  );

  -- CREATE help_feedback
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'help_feedback',
    'create',
    '{}',
    'article,rating,feedback,contact_id',
    portal_policy_id
  );

  RAISE NOTICE 'Client Portal User role and permissions created successfully with ID: %', portal_role_id;
END $$;

-- =============================================================================
-- UPDATE COLLECTION METADATA
-- =============================================================================

-- Update collections to be visible in client portal
UPDATE directus_collections SET hidden = false
WHERE collection IN (
  'projects', 'os_projects', 'project_contacts', 'os_project_contacts',
  'todos', 'os_tasks', 'os_invoices', 'os_invoice_items', 'os_payments',
  'conversations', 'messages', 'conversation_participants',
  'os_proposals', 'os_proposal_blocks', 'os_proposal_approvals',
  'help_collections', 'help_articles', 'help_feedback'
);
