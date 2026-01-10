-- Migration: 096_nodered_fields.sql
-- Description: Configure Directus field UI for Node-RED collections

-- ============================================================================
-- nodered_tenant_config fields
-- ============================================================================

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
VALUES
  ('nodered_tenant_config', 'id', 'uuid', 'input', NULL, 'raw', NULL, true, true, 1, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_tenant_config', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', false, false, 2, 'half', NULL, 'The organization this config belongs to', NULL, true, NULL, NULL, NULL),
  ('nodered_tenant_config', 'enabled', NULL, 'boolean', '{"label":"Enable Node-RED for this tenant"}', 'boolean', NULL, false, false, 3, 'half', NULL, 'Turn on/off Node-RED access', NULL, false, NULL, NULL, NULL),
  ('nodered_tenant_config', 'editor_access_roles', 'cast-json', 'tags', '{"presets":["admin","editor","member"]}', 'labels', NULL, false, false, 4, 'half', NULL, 'Roles that can access the Node-RED editor', NULL, false, NULL, NULL, NULL),
  ('nodered_tenant_config', 'flow_execution_tier', NULL, 'select-dropdown', '{"choices":[{"text":"Community","value":"community"},{"text":"Professional","value":"professional"},{"text":"Enterprise","value":"enterprise"}]}', 'raw', NULL, false, false, 5, 'half', NULL, 'Rate limiting tier for executions', NULL, false, NULL, NULL, NULL),
  ('nodered_tenant_config', 'custom_nodes', 'cast-json', 'tags', NULL, 'labels', NULL, false, false, 6, 'full', NULL, 'Allowed community Node-RED packages', NULL, false, NULL, NULL, NULL),
  ('nodered_tenant_config', 'credential_secret', NULL, 'input', '{"masked":true}', 'raw', NULL, true, true, 7, 'full', NULL, 'Auto-generated encryption secret', NULL, false, NULL, NULL, NULL),
  ('nodered_tenant_config', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Draft","value":"draft"},{"text":"Published","value":"published"},{"text":"Archived","value":"archived"}]}', 'labels', '{"showAsDot":true,"choices":[{"text":"Draft","value":"draft","foreground":"#ffffff","background":"#6B7280"},{"text":"Published","value":"published","foreground":"#ffffff","background":"#10B981"},{"text":"Archived","value":"archived","foreground":"#ffffff","background":"#EF4444"}]}', false, false, 8, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_tenant_config', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative":true}', true, true, 9, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_tenant_config', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative":true}', true, true, 10, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_tenant_config', 'user_created', 'user-created', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}', 'user', NULL, true, true, 11, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_tenant_config', 'user_updated', 'user-updated', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}', 'user', NULL, true, true, 12, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL)
ON CONFLICT (collection, field) DO UPDATE SET
  interface = EXCLUDED.interface,
  options = EXCLUDED.options,
  display = EXCLUDED.display,
  display_options = EXCLUDED.display_options,
  note = EXCLUDED.note;

-- ============================================================================
-- nodered_flow_limits fields
-- ============================================================================

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
VALUES
  ('nodered_flow_limits', 'id', 'uuid', 'input', NULL, 'raw', NULL, true, true, 1, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_flow_limits', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', false, false, 2, 'half', NULL, 'Organization (NULL for default tier limits)', NULL, false, NULL, NULL, NULL),
  ('nodered_flow_limits', 'tier', NULL, 'select-dropdown', '{"choices":[{"text":"Free","value":"free"},{"text":"Pro","value":"pro"},{"text":"Agency","value":"agency"},{"text":"Enterprise","value":"enterprise"},{"text":"Lifetime","value":"lifetime"}]}', 'labels', '{"choices":[{"text":"Free","value":"free","foreground":"#000","background":"#e5e7eb"},{"text":"Pro","value":"pro","foreground":"#fff","background":"#3b82f6"},{"text":"Agency","value":"agency","foreground":"#fff","background":"#f97316"},{"text":"Enterprise","value":"enterprise","foreground":"#fff","background":"#8b5cf6"},{"text":"Lifetime","value":"lifetime","foreground":"#fff","background":"#10b981"}]}', false, false, 3, 'half', NULL, 'Subscription tier', NULL, true, NULL, NULL, NULL),
  ('nodered_flow_limits', 'max_flows', NULL, 'input', '{"min":0}', 'raw', NULL, false, false, 4, 'half', NULL, 'Maximum number of flows', NULL, true, NULL, NULL, NULL),
  ('nodered_flow_limits', 'max_executions_per_day', NULL, 'input', '{"min":0}', 'raw', NULL, false, false, 5, 'half', NULL, 'Maximum executions per day', NULL, true, NULL, NULL, NULL),
  ('nodered_flow_limits', 'max_nodes_per_flow', NULL, 'input', '{"min":1}', 'raw', NULL, false, false, 6, 'half', NULL, 'Maximum nodes per flow', NULL, false, NULL, NULL, NULL),
  ('nodered_flow_limits', 'current_flow_count', NULL, 'input', '{"min":0}', 'raw', NULL, true, false, 7, 'half', NULL, 'Current flow count (auto-updated)', NULL, false, NULL, NULL, NULL),
  ('nodered_flow_limits', 'current_daily_executions', NULL, 'input', '{"min":0}', 'raw', NULL, true, false, 8, 'half', NULL, 'Current daily executions (auto-reset)', NULL, false, NULL, NULL, NULL),
  ('nodered_flow_limits', 'executions_reset_at', NULL, 'datetime', NULL, 'datetime', '{"relative":true}', true, false, 9, 'half', NULL, 'Last execution count reset', NULL, false, NULL, NULL, NULL),
  ('nodered_flow_limits', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Draft","value":"draft"},{"text":"Published","value":"published"},{"text":"Archived","value":"archived"}]}', 'labels', '{"showAsDot":true}', false, true, 10, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_flow_limits', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative":true}', true, true, 11, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_flow_limits', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative":true}', true, true, 12, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL)
ON CONFLICT (collection, field) DO UPDATE SET
  interface = EXCLUDED.interface,
  options = EXCLUDED.options,
  display = EXCLUDED.display,
  display_options = EXCLUDED.display_options,
  note = EXCLUDED.note;

-- ============================================================================
-- nodered_execution_logs fields
-- ============================================================================

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
VALUES
  ('nodered_execution_logs', 'id', 'uuid', 'input', NULL, 'raw', NULL, true, true, 1, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', true, false, 2, 'half', NULL, 'Organization that executed the flow', NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'flow_id', NULL, 'input', NULL, 'raw', NULL, true, false, 3, 'half', NULL, 'Node-RED internal flow ID', NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'flow_name', NULL, 'input', NULL, 'raw', NULL, true, false, 4, 'half', NULL, 'Human-readable flow name', NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'trigger_type', NULL, 'select-dropdown', '{"choices":[{"text":"Webhook","value":"webhook"},{"text":"Schedule","value":"schedule"},{"text":"Manual","value":"manual"},{"text":"Directus","value":"directus"},{"text":"API","value":"api"}]}', 'labels', NULL, true, false, 5, 'half', NULL, 'What triggered the execution', NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'trigger_source', NULL, 'input', NULL, 'raw', NULL, true, false, 6, 'half', NULL, 'Source identifier', NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Running","value":"running"},{"text":"Completed","value":"completed"},{"text":"Failed","value":"failed"},{"text":"Timeout","value":"timeout"}]}', 'labels', '{"showAsDot":true,"choices":[{"text":"Running","value":"running","foreground":"#fff","background":"#3b82f6"},{"text":"Completed","value":"completed","foreground":"#fff","background":"#10b981"},{"text":"Failed","value":"failed","foreground":"#fff","background":"#ef4444"},{"text":"Timeout","value":"timeout","foreground":"#fff","background":"#f59e0b"}]}', true, false, 7, 'half', NULL, 'Execution status', NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'started_at', NULL, 'datetime', NULL, 'datetime', '{"relative":true}', true, false, 8, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'completed_at', NULL, 'datetime', NULL, 'datetime', '{"relative":true}', true, false, 9, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'duration_ms', NULL, 'input', NULL, 'raw', '{"suffix":"ms"}', true, false, 10, 'half', NULL, 'Execution duration', NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'nodes_executed', NULL, 'input', NULL, 'raw', NULL, true, false, 11, 'half', NULL, 'Number of nodes executed', NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'error_message', NULL, 'input-multiline', NULL, 'raw', NULL, true, false, 12, 'full', NULL, 'Error message if failed', NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'error_stack', NULL, 'input-code', '{"language":"plaintext"}', 'raw', NULL, true, true, 13, 'full', NULL, 'Error stack trace', NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'input_summary', 'cast-json', 'input-code', '{"language":"json"}', 'raw', NULL, true, true, 14, 'full', NULL, 'Sanitized input data', NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'output_summary', 'cast-json', 'input-code', '{"language":"json"}', 'raw', NULL, true, true, 15, 'full', NULL, 'Sanitized output data', NULL, false, NULL, NULL, NULL),
  ('nodered_execution_logs', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative":true}', true, true, 16, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL)
ON CONFLICT (collection, field) DO UPDATE SET
  interface = EXCLUDED.interface,
  options = EXCLUDED.options,
  display = EXCLUDED.display,
  display_options = EXCLUDED.display_options,
  note = EXCLUDED.note;

-- ============================================================================
-- nodered_templates fields
-- ============================================================================

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
VALUES
  ('nodered_templates', 'id', 'uuid', 'input', NULL, 'raw', NULL, true, true, 1, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Draft","value":"draft"},{"text":"Published","value":"published"},{"text":"Archived","value":"archived"}]}', 'labels', '{"showAsDot":true,"choices":[{"text":"Draft","value":"draft","foreground":"#fff","background":"#6B7280"},{"text":"Published","value":"published","foreground":"#fff","background":"#10B981"},{"text":"Archived","value":"archived","foreground":"#fff","background":"#EF4444"}]}', false, false, 2, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'name', NULL, 'input', NULL, 'raw', NULL, false, false, 3, 'half', NULL, 'Template name', NULL, true, NULL, NULL, NULL),
  ('nodered_templates', 'slug', NULL, 'input', NULL, 'raw', NULL, false, false, 4, 'half', NULL, 'URL-friendly identifier', NULL, true, NULL, NULL, NULL),
  ('nodered_templates', 'description', NULL, 'input-rich-text-md', NULL, 'raw', NULL, false, false, 5, 'full', NULL, 'What this template does', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'category', NULL, 'select-dropdown', '{"choices":[{"text":"AI Agents","value":"ai-agents"},{"text":"Notifications","value":"notifications"},{"text":"Integrations","value":"integrations"},{"text":"Scheduling","value":"scheduling"},{"text":"Data Processing","value":"data-processing"},{"text":"DevOps","value":"devops"}]}', 'labels', NULL, false, false, 6, 'half', NULL, 'Template category', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'icon', NULL, 'input', NULL, 'raw', NULL, false, false, 7, 'quarter', NULL, 'Material icon name', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'color', NULL, 'select-color', NULL, 'color', NULL, false, false, 8, 'quarter', NULL, 'Accent color', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'flow_json', 'cast-json', 'input-code', '{"language":"json","lineNumber":true}', 'raw', NULL, false, false, 9, 'full', NULL, 'Node-RED flow JSON definition', NULL, true, NULL, NULL, NULL),
  ('nodered_templates', 'required_nodes', 'cast-json', 'tags', NULL, 'labels', NULL, false, false, 10, 'half', NULL, 'Required node packages', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'required_credentials', 'cast-json', 'tags', '{"presets":["openai","anthropic","slack","github","notion","hubspot","stripe","google"]}', 'labels', NULL, false, false, 11, 'half', NULL, 'Required credential types', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'version', NULL, 'input', NULL, 'raw', NULL, false, false, 12, 'quarter', NULL, 'Semantic version', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'author', NULL, 'input', NULL, 'raw', NULL, false, false, 13, 'quarter', NULL, 'Template author', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'tags', 'cast-json', 'tags', NULL, 'labels', NULL, false, false, 14, 'half', NULL, 'Search tags', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'difficulty', NULL, 'select-dropdown', '{"choices":[{"text":"Beginner","value":"beginner"},{"text":"Intermediate","value":"intermediate"},{"text":"Advanced","value":"advanced"}]}', 'labels', '{"choices":[{"text":"Beginner","value":"beginner","foreground":"#fff","background":"#10b981"},{"text":"Intermediate","value":"intermediate","foreground":"#fff","background":"#f59e0b"},{"text":"Advanced","value":"advanced","foreground":"#fff","background":"#ef4444"}]}', false, false, 15, 'quarter', NULL, 'Setup difficulty', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'estimated_setup_minutes', NULL, 'input', '{"min":1}', 'raw', '{"suffix":" min"}', false, false, 16, 'quarter', NULL, 'Setup time estimate', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'install_count', NULL, 'input', NULL, 'raw', NULL, true, false, 17, 'quarter', NULL, 'Times installed', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'rating_average', NULL, 'input', NULL, 'raw', NULL, true, false, 18, 'quarter', NULL, 'Average rating', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'rating_count', NULL, 'input', NULL, 'raw', NULL, true, false, 19, 'quarter', NULL, 'Number of ratings', NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative":true}', true, true, 20, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative":true}', true, true, 21, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'user_created', 'user-created', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}', 'user', NULL, true, true, 22, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_templates', 'user_updated', 'user-updated', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}', 'user', NULL, true, true, 23, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL)
ON CONFLICT (collection, field) DO UPDATE SET
  interface = EXCLUDED.interface,
  options = EXCLUDED.options,
  display = EXCLUDED.display,
  display_options = EXCLUDED.display_options,
  note = EXCLUDED.note;

-- ============================================================================
-- nodered_template_installs fields
-- ============================================================================

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
VALUES
  ('nodered_template_installs', 'id', 'uuid', 'input', NULL, 'raw', NULL, true, true, 1, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_template_installs', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', false, false, 2, 'half', NULL, 'Organization that installed', NULL, true, NULL, NULL, NULL),
  ('nodered_template_installs', 'template_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', false, false, 3, 'half', NULL, 'Template installed', NULL, true, NULL, NULL, NULL),
  ('nodered_template_installs', 'installed_at', NULL, 'datetime', NULL, 'datetime', '{"relative":true}', true, false, 4, 'half', NULL, 'When installed', NULL, false, NULL, NULL, NULL),
  ('nodered_template_installs', 'flow_id', NULL, 'input', NULL, 'raw', NULL, true, false, 5, 'half', NULL, 'Created flow ID', NULL, false, NULL, NULL, NULL),
  ('nodered_template_installs', 'customizations', 'cast-json', 'input-code', '{"language":"json"}', 'raw', NULL, true, true, 6, 'full', NULL, 'Customizations made', NULL, false, NULL, NULL, NULL),
  ('nodered_template_installs', 'rating', NULL, 'slider', '{"minValue":1,"maxValue":5,"stepInterval":1}', 'raw', NULL, false, false, 7, 'half', NULL, 'User rating (1-5)', NULL, false, NULL, NULL, NULL),
  ('nodered_template_installs', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative":true}', true, true, 8, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_template_installs', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative":true}', true, true, 9, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL)
ON CONFLICT (collection, field) DO UPDATE SET
  interface = EXCLUDED.interface,
  options = EXCLUDED.options,
  display = EXCLUDED.display,
  display_options = EXCLUDED.display_options,
  note = EXCLUDED.note;

-- ============================================================================
-- nodered_template_categories fields
-- ============================================================================

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
VALUES
  ('nodered_template_categories', 'id', 'uuid', 'input', NULL, 'raw', NULL, true, true, 1, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_template_categories', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Draft","value":"draft"},{"text":"Published","value":"published"},{"text":"Archived","value":"archived"}]}', 'labels', '{"showAsDot":true}', false, false, 2, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_template_categories', 'name', NULL, 'input', NULL, 'raw', NULL, false, false, 3, 'half', NULL, 'Category name', NULL, true, NULL, NULL, NULL),
  ('nodered_template_categories', 'slug', NULL, 'input', NULL, 'raw', NULL, false, false, 4, 'half', NULL, 'URL-friendly identifier', NULL, true, NULL, NULL, NULL),
  ('nodered_template_categories', 'description', NULL, 'input-multiline', NULL, 'raw', NULL, false, false, 5, 'full', NULL, 'Category description', NULL, false, NULL, NULL, NULL),
  ('nodered_template_categories', 'icon', NULL, 'input', NULL, 'raw', NULL, false, false, 6, 'quarter', NULL, 'Material icon name', NULL, false, NULL, NULL, NULL),
  ('nodered_template_categories', 'color', NULL, 'select-color', NULL, 'color', NULL, false, false, 7, 'quarter', NULL, 'Category color', NULL, false, NULL, NULL, NULL),
  ('nodered_template_categories', 'sort', NULL, 'input', '{"min":0}', 'raw', NULL, false, false, 8, 'quarter', NULL, 'Sort order', NULL, false, NULL, NULL, NULL),
  ('nodered_template_categories', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative":true}', true, true, 9, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('nodered_template_categories', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative":true}', true, true, 10, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL)
ON CONFLICT (collection, field) DO UPDATE SET
  interface = EXCLUDED.interface,
  options = EXCLUDED.options,
  display = EXCLUDED.display,
  display_options = EXCLUDED.display_options,
  note = EXCLUDED.note;

-- ============================================================================
-- Relations
-- ============================================================================

INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES
  ('nodered_tenant_config', 'organization_id', 'organizations', NULL, NULL, NULL, NULL, NULL, 'nullify'),
  ('nodered_tenant_config', 'user_created', 'directus_users', NULL, NULL, NULL, NULL, NULL, 'nullify'),
  ('nodered_tenant_config', 'user_updated', 'directus_users', NULL, NULL, NULL, NULL, NULL, 'nullify'),
  ('nodered_flow_limits', 'organization_id', 'organizations', NULL, NULL, NULL, NULL, NULL, 'nullify'),
  ('nodered_flow_limits', 'user_created', 'directus_users', NULL, NULL, NULL, NULL, NULL, 'nullify'),
  ('nodered_flow_limits', 'user_updated', 'directus_users', NULL, NULL, NULL, NULL, NULL, 'nullify'),
  ('nodered_execution_logs', 'organization_id', 'organizations', NULL, NULL, NULL, NULL, NULL, 'nullify'),
  ('nodered_execution_logs', 'user_created', 'directus_users', NULL, NULL, NULL, NULL, NULL, 'nullify'),
  ('nodered_templates', 'user_created', 'directus_users', NULL, NULL, NULL, NULL, NULL, 'nullify'),
  ('nodered_templates', 'user_updated', 'directus_users', NULL, NULL, NULL, NULL, NULL, 'nullify'),
  ('nodered_template_installs', 'organization_id', 'organizations', NULL, NULL, NULL, NULL, NULL, 'cascade'),
  ('nodered_template_installs', 'template_id', 'nodered_templates', NULL, NULL, NULL, NULL, NULL, 'cascade'),
  ('nodered_template_installs', 'user_created', 'directus_users', NULL, NULL, NULL, NULL, NULL, 'nullify'),
  ('nodered_template_installs', 'user_updated', 'directus_users', NULL, NULL, NULL, NULL, NULL, 'nullify'),
  ('nodered_template_categories', 'user_created', 'directus_users', NULL, NULL, NULL, NULL, NULL, 'nullify'),
  ('nodered_template_categories', 'user_updated', 'directus_users', NULL, NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;


