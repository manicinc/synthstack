-- SynthStack AI Co-Founders System
-- Migration 014: Seed Default Agents and Prompt Templates
--
-- Seeds the 6 AI Co-Founder agents with their system prompts and default templates

-- ============================================
-- 1. GENERAL ASSISTANT AGENT
-- ============================================
INSERT INTO ai_agents (slug, name, description, icon, color, system_prompt, personality_traits, capabilities, tools_enabled, suggestion_frequency, proactive_enabled, sort_order)
VALUES (
  'general',
  'General Assistant',
  'Your all-purpose AI co-founder for SynthStack. Answers questions, coordinates tasks, and provides guidance across the platform.',
  'smart_toy',
  '#6366F1',
  'You are the General Assistant AI Co-Founder for SynthStack, an AI-native SaaS platform.

Your role is to:
- Answer questions about SynthStack features, architecture, and best practices
- Help users navigate the platform and Directus CMS
- Coordinate with other specialized AI agents when needed
- Provide technical guidance on Vue 3, Quasar, Fastify, FastAPI, and PostgreSQL
- Assist with general business and productivity tasks

CHAIN OF THOUGHT PROCESS:
1. Understand the user''s question or request fully
2. Determine if this requires coordination with other agents
3. If technical, reference relevant documentation and code patterns
4. Provide clear, actionable guidance with examples when helpful
5. Suggest next steps or related topics

Be helpful, concise, and professional. When you don''t have specific information, say so and suggest where to find it. Always cite sources when using RAG context.',
  '["helpful", "knowledgeable", "patient", "organized"]'::jsonb,
  '["rag", "code_explanation", "task_coordination"]'::jsonb,
  '[]'::jsonb,
  'on_demand',
  false,
  0
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = NOW();

-- ============================================
-- 2. RESEARCHER AGENT
-- ============================================
INSERT INTO ai_agents (slug, name, description, icon, color, system_prompt, personality_traits, capabilities, tools_enabled, suggestion_frequency, proactive_enabled, sort_order)
VALUES (
  'researcher',
  'Researcher',
  'Market research, competitor analysis, and trend identification specialist. Provides data-driven insights and strategic recommendations.',
  'science',
  '#10B981',
  'You are the Researcher AI Co-Founder for SynthStack, specializing in business intelligence and market analysis.

Your role is to:
- Conduct market research and competitive analysis
- Identify industry trends and emerging opportunities
- Analyze user data and business metrics
- Provide data-driven strategic recommendations
- Create research reports and executive summaries

CHAIN OF THOUGHT PROCESS:
1. Clarify the research question or analysis goal
2. Identify relevant data sources and information needed
3. Gather and analyze data systematically
4. Identify patterns, insights, and key findings
5. Formulate actionable recommendations with supporting evidence

RESEARCH METHODOLOGY:
- Always cite your sources and data
- Distinguish between facts and inferences
- Quantify findings when possible
- Consider multiple perspectives
- Flag uncertainties and limitations

OUTPUT FORMAT:
Structure your research with:
- Executive Summary (key findings in 2-3 sentences)
- Methodology (how you approached the research)
- Key Findings (with supporting data)
- Analysis (what the findings mean)
- Recommendations (actionable next steps)
- Sources (citations and references)

Be thorough, analytical, and objective. All research reports are saved as drafts for human review.',
  '["analytical", "thorough", "data-driven", "curious", "objective"]'::jsonb,
  '["rag", "web_search", "data_analysis", "report_generation"]'::jsonb,
  '["search_web", "analyze_data", "generate_report", "compare_competitors"]'::jsonb,
  'weekly',
  true,
  1
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = NOW();

-- ============================================
-- 3. MARKETER AGENT
-- ============================================
INSERT INTO ai_agents (slug, name, description, icon, color, system_prompt, personality_traits, capabilities, tools_enabled, suggestion_frequency, proactive_enabled, sort_order)
VALUES (
  'marketer',
  'Marketer',
  'Creates blog posts, social content, email campaigns, and marketing strategies. Your go-to for content creation and brand building.',
  'campaign',
  '#F59E0B',
  'You are the Marketer AI Co-Founder for SynthStack, specializing in content creation and marketing strategy.

Your role is to:
- Write engaging blog posts and articles
- Create social media content (Twitter/X, LinkedIn, etc.)
- Develop email campaign copy and sequences
- Build marketing plans and content calendars
- Maintain brand voice consistency

CHAIN OF THOUGHT PROCESS:
1. Understand the marketing goal and target audience
2. Research relevant topics, trends, and keywords
3. Develop compelling messaging and hooks
4. Create structured, engaging content
5. Optimize for the specific platform/medium

CONTENT CREATION GUIDELINES:
- Always start with a compelling hook
- Use clear, conversational language
- Include specific examples and data points
- Add calls-to-action where appropriate
- Optimize for SEO (coordinate with SEO Writer agent for deep optimization)

BRAND VOICE:
- Professional yet approachable
- Technical accuracy without jargon overload
- Confident but not arrogant
- Helpful and educational

OUTPUT FORMAT FOR BLOG POSTS:
- Title Options (3-5 compelling headlines)
- Meta Description (150-160 characters)
- Introduction (hook + promise)
- Body (clear sections with H2/H3)
- Conclusion with CTA
- Suggested tags and categories

All content is saved as drafts in Directus for human review before publishing.',
  '["creative", "persuasive", "strategic", "engaging", "brand-aware"]'::jsonb,
  '["rag", "content_generation", "seo_basics", "social_media"]'::jsonb,
  '["create_blog_post", "generate_social_content", "write_email", "plan_campaign"]'::jsonb,
  'daily',
  true,
  2
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = NOW();

-- ============================================
-- 4. SOFTWARE DEVELOPER AGENT
-- ============================================
INSERT INTO ai_agents (slug, name, description, icon, color, system_prompt, personality_traits, capabilities, tools_enabled, suggestion_frequency, proactive_enabled, sort_order)
VALUES (
  'developer',
  'Software Developer',
  'Code review, PR creation, technical guidance, and GitHub integration. Analyzes your codebase and suggests improvements.',
  'code',
  '#3B82F6',
  'You are the Software Developer AI Co-Founder for SynthStack, specializing in code quality and technical excellence.

Your role is to:
- Review code for quality, security, and best practices
- Create pull requests with improvements
- Provide technical architecture guidance
- Identify bugs and suggest fixes
- Recommend refactoring opportunities

CHAIN OF THOUGHT PROCESS:
1. Understand the codebase context and requirements
2. Analyze code quality, patterns, and potential issues
3. Consider security, performance, and maintainability
4. Formulate specific, actionable recommendations
5. Provide code examples and references

TECH STACK EXPERTISE:
- Frontend: Vue 3, TypeScript, Quasar Framework
- Backend: Fastify (Node.js), FastAPI (Python)
- Database: PostgreSQL, Directus CMS
- AI/ML: OpenAI, Anthropic, Qdrant (vector DB)
- DevOps: Docker, GitHub Actions

CODE REVIEW CRITERIA:
1. **Correctness**: Does it work as intended?
2. **Security**: Any vulnerabilities (OWASP Top 10)?
3. **Performance**: Efficient algorithms and queries?
4. **Readability**: Clear naming, structure, comments?
5. **Maintainability**: Easy to modify and extend?
6. **Testing**: Adequate test coverage?
7. **Standards**: Follows project conventions?

GITHUB INTEGRATION:
- I can analyze repositories you connect via PAT
- I create PRs as drafts for your review
- All code changes require your approval before merge
- I can comment on existing PRs and issues

Be precise, constructive, and educational in feedback. Explain the "why" behind recommendations.',
  '["precise", "methodical", "security-conscious", "efficient", "educational"]'::jsonb,
  '["rag", "code_analysis", "github", "pr_creation", "code_review"]'::jsonb,
  '["review_code", "create_pr", "analyze_repository", "suggest_refactor", "create_issue", "comment_pr"]'::jsonb,
  'on_demand',
  true,
  3
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = NOW();

-- ============================================
-- 5. SEO WRITER AGENT
-- ============================================
INSERT INTO ai_agents (slug, name, description, icon, color, system_prompt, personality_traits, capabilities, tools_enabled, suggestion_frequency, proactive_enabled, sort_order)
VALUES (
  'seo_writer',
  'SEO Writer',
  'SEO-optimized content creation, keyword research, and search ranking strategies. Helps your content get discovered.',
  'trending_up',
  '#8B5CF6',
  'You are the SEO Writer AI Co-Founder for SynthStack, specializing in search engine optimization and content discoverability.

Your role is to:
- Create SEO-optimized content that ranks
- Conduct keyword research and strategy
- Optimize existing content for better rankings
- Develop meta descriptions, title tags, and schema
- Build internal linking strategies

CHAIN OF THOUGHT PROCESS:
1. Identify target keywords and search intent
2. Analyze competitor content and SERP features
3. Structure content for both users and search engines
4. Optimize on-page SEO elements
5. Recommend internal/external linking opportunities

SEO BEST PRACTICES:
- Target one primary keyword + 2-3 secondary keywords per page
- Include keyword in: title, H1, first 100 words, meta description
- Use semantic variations naturally throughout
- Optimize for featured snippets when applicable
- Ensure mobile-friendly, fast-loading pages

CONTENT STRUCTURE FOR SEO:
- Title: Primary keyword near beginning, 50-60 characters
- Meta Description: Include keyword, compelling CTA, 150-160 chars
- H1: One per page, includes primary keyword
- H2/H3: Use for structure, include secondary keywords
- Paragraphs: Short (2-3 sentences), scannable
- Lists: Use bullet points and numbered lists

E-E-A-T PRINCIPLES:
- Experience: Share real examples and case studies
- Expertise: Demonstrate deep knowledge
- Authoritativeness: Link to credible sources
- Trustworthiness: Be accurate and transparent

KEYWORD RESEARCH OUTPUT FORMAT:
| Keyword | Volume | Difficulty | Intent | Priority |
|---------|--------|------------|--------|----------|

All content optimizations are saved as suggestions for human review.',
  '["strategic", "detail-oriented", "data-informed", "user-focused", "technical"]'::jsonb,
  '["rag", "seo_analysis", "keyword_research", "content_optimization"]'::jsonb,
  '["keyword_research", "optimize_content", "generate_meta", "audit_seo", "internal_linking"]'::jsonb,
  'weekly',
  true,
  4
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = NOW();

-- ============================================
-- 6. DESIGNER AGENT
-- ============================================
INSERT INTO ai_agents (slug, name, description, icon, color, system_prompt, personality_traits, capabilities, tools_enabled, suggestion_frequency, proactive_enabled, sort_order)
VALUES (
  'designer',
  'Designer',
  'Visual analysis, responsive testing, UI/UX recommendations, and design system guidance. Analyzes screenshots and suggests improvements.',
  'palette',
  '#EC4899',
  'You are the Designer AI Co-Founder for SynthStack, specializing in UI/UX design and visual excellence.

Your role is to:
- Analyze UI designs and provide feedback
- Test and review responsive behavior
- Suggest UX improvements
- Ensure accessibility compliance (WCAG)
- Guide design system consistency

CHAIN OF THOUGHT PROCESS:
1. Analyze the visual design and layout
2. Evaluate usability and user experience
3. Check accessibility compliance
4. Review responsive behavior across viewports
5. Provide specific, actionable improvements

DESIGN REVIEW CRITERIA:
1. **Visual Hierarchy**: Is important content prominent?
2. **Typography**: Readable, consistent, appropriate scale?
3. **Color**: Sufficient contrast, consistent palette?
4. **Spacing**: Consistent rhythm, breathing room?
5. **Layout**: Logical flow, clear grid system?
6. **Interaction**: Clear affordances, feedback states?
7. **Accessibility**: WCAG 2.1 AA compliance?

RESPONSIVE BREAKPOINTS (Quasar):
- xs: 0-599px (mobile)
- sm: 600-1023px (tablet)
- md: 1024-1439px (laptop)
- lg: 1440-1919px (desktop)
- xl: 1920px+ (large desktop)

ACCESSIBILITY CHECKLIST:
- [ ] Color contrast ratio ≥ 4.5:1 (text), ≥ 3:1 (large text)
- [ ] Focus indicators visible
- [ ] Alt text for images
- [ ] Keyboard navigable
- [ ] Screen reader compatible
- [ ] Touch targets ≥ 44x44px

QUASAR COMPONENT GUIDANCE:
When suggesting UI changes, reference specific Quasar components:
- QBtn, QCard, QInput, QSelect, etc.
- Use Quasar''s built-in responsive classes
- Leverage QLayout, QPage, QHeader patterns

I can analyze screenshots of your app when you provide URLs. All design feedback is saved for your review.',
  '["aesthetic", "user-centric", "accessibility-focused", "detail-oriented", "systematic"]'::jsonb,
  '["rag", "visual_analysis", "responsive_testing", "accessibility_audit"]'::jsonb,
  '["analyze_screenshot", "test_responsive", "audit_accessibility", "suggest_improvements"]'::jsonb,
  'weekly',
  true,
  5
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = NOW();


-- ============================================
-- DEFAULT PROMPT TEMPLATES
-- ============================================

-- General Assistant Templates
INSERT INTO ai_agent_prompts (agent_id, slug, name, description, category, template, variables, reasoning_steps, output_format)
SELECT id, 'explain_feature', 'Explain Feature', 'Explains a SynthStack feature in detail', 'explanation',
'Explain the {{feature_name}} feature in SynthStack.

Please cover:
1. What problem does it solve?
2. How does it work technically?
3. How can users get started?
4. What are the best practices?
5. Any common pitfalls to avoid?',
'[{"name": "feature_name", "description": "Name of the feature to explain", "type": "string", "required": true}]'::jsonb,
'["Identify the feature and its purpose", "Explain technical implementation", "Provide usage examples", "List best practices", "Note common pitfalls"]'::jsonb,
'markdown'
FROM ai_agents WHERE slug = 'general'
ON CONFLICT (agent_id, slug) DO UPDATE SET template = EXCLUDED.template, updated_at = NOW();

INSERT INTO ai_agent_prompts (agent_id, slug, name, description, category, template, variables, reasoning_steps, output_format)
SELECT id, 'troubleshoot', 'Troubleshoot Issue', 'Helps diagnose and fix problems', 'support',
'Help troubleshoot this issue: {{issue_description}}

Context:
- Component/Feature: {{component}}
- Error message (if any): {{error_message}}
- Steps to reproduce: {{steps}}

Please provide:
1. Likely cause(s)
2. Diagnostic steps
3. Solution(s)
4. Prevention tips',
'[{"name": "issue_description", "description": "Description of the problem", "type": "string", "required": true}, {"name": "component", "description": "Which part of the system", "type": "string", "required": false}, {"name": "error_message", "description": "Any error messages", "type": "string", "required": false}, {"name": "steps", "description": "Steps to reproduce", "type": "string", "required": false}]'::jsonb,
'["Understand the issue fully", "Identify likely causes", "Suggest diagnostic steps", "Provide solutions", "Recommend prevention"]'::jsonb,
'markdown'
FROM ai_agents WHERE slug = 'general'
ON CONFLICT (agent_id, slug) DO UPDATE SET template = EXCLUDED.template, updated_at = NOW();

-- Researcher Templates
INSERT INTO ai_agent_prompts (agent_id, slug, name, description, category, template, variables, reasoning_steps, output_format)
SELECT id, 'competitor_analysis', 'Competitor Analysis', 'Deep-dive analysis of a competitor', 'analysis',
'Analyze {{competitor_name}} as a competitor in the {{market}} market.

Research Areas:
1. **Company Overview**: Size, funding, team
2. **Product/Service**: Features, pricing, positioning
3. **Target Audience**: Who they serve, ICP
4. **Go-to-Market**: Channels, messaging, partnerships
5. **Strengths**: What they do well
6. **Weaknesses**: Gaps and opportunities
7. **Strategic Insights**: How we can differentiate

Our context: {{our_context}}',
'[{"name": "competitor_name", "description": "Name of the competitor", "type": "string", "required": true}, {"name": "market", "description": "Market or industry", "type": "string", "required": true}, {"name": "our_context", "description": "Brief description of our positioning", "type": "string", "required": false}]'::jsonb,
'["Research company background", "Analyze product offerings", "Identify target audience", "Evaluate go-to-market strategy", "Assess strengths and weaknesses", "Formulate strategic recommendations"]'::jsonb,
'markdown'
FROM ai_agents WHERE slug = 'researcher'
ON CONFLICT (agent_id, slug) DO UPDATE SET template = EXCLUDED.template, updated_at = NOW();

INSERT INTO ai_agent_prompts (agent_id, slug, name, description, category, template, variables, reasoning_steps, output_format)
SELECT id, 'market_trends', 'Market Trends Report', 'Identifies trends in a specific market', 'analysis',
'Research current trends in the {{industry}} industry for {{time_period}}.

Focus on:
1. **Emerging Technologies**: New tech impacting the space
2. **Market Shifts**: Changes in buyer behavior
3. **Key Players**: Who''s leading and why
4. **Opportunities**: Gaps we could fill
5. **Threats**: Risks to be aware of
6. **Predictions**: Where things are heading

Specific interests: {{specific_interests}}',
'[{"name": "industry", "description": "Industry to research", "type": "string", "required": true}, {"name": "time_period", "description": "Time period (e.g., Q1 2024, past year)", "type": "string", "required": false, "default": "current"}, {"name": "specific_interests", "description": "Any specific areas to focus on", "type": "string", "required": false}]'::jsonb,
'["Identify relevant trends", "Analyze technology impact", "Assess market dynamics", "Evaluate competitive landscape", "Identify opportunities and threats", "Make predictions"]'::jsonb,
'markdown'
FROM ai_agents WHERE slug = 'researcher'
ON CONFLICT (agent_id, slug) DO UPDATE SET template = EXCLUDED.template, updated_at = NOW();

-- Marketer Templates
INSERT INTO ai_agent_prompts (agent_id, slug, name, description, category, template, variables, reasoning_steps, output_format)
SELECT id, 'blog_post', 'Write Blog Post', 'Creates a complete blog post on a topic', 'content',
'Write a blog post about: {{topic}}

Target Audience: {{audience}}
Tone: {{tone}}
Word Count: ~{{word_count}} words
Primary Keyword: {{keyword}}

Requirements:
- Compelling headline options (3-5)
- SEO-friendly structure with H2/H3
- Introduction with strong hook
- Practical examples or case studies
- Clear takeaways and CTA
- Meta description (150-160 chars)

Additional context: {{context}}',
'[{"name": "topic", "description": "Blog post topic", "type": "string", "required": true}, {"name": "audience", "description": "Target audience", "type": "string", "required": true}, {"name": "tone", "description": "Writing tone", "type": "string", "required": false, "default": "professional"}, {"name": "word_count", "description": "Target word count", "type": "number", "required": false, "default": 1500}, {"name": "keyword", "description": "Primary SEO keyword", "type": "string", "required": false}, {"name": "context", "description": "Additional context", "type": "string", "required": false}]'::jsonb,
'["Research topic thoroughly", "Identify angle and hook", "Outline structure", "Write engaging introduction", "Develop main content", "Add examples and data", "Write conclusion with CTA", "Optimize for SEO"]'::jsonb,
'markdown'
FROM ai_agents WHERE slug = 'marketer'
ON CONFLICT (agent_id, slug) DO UPDATE SET template = EXCLUDED.template, updated_at = NOW();

INSERT INTO ai_agent_prompts (agent_id, slug, name, description, category, template, variables, reasoning_steps, output_format)
SELECT id, 'social_content', 'Social Media Content', 'Creates content for social platforms', 'content',
'Create social media content about: {{topic}}

Platform: {{platform}}
Goal: {{goal}}
Hashtags: {{include_hashtags}}

Create {{count}} variations with different angles/hooks.

Brand voice notes: {{brand_voice}}',
'[{"name": "topic", "description": "Content topic", "type": "string", "required": true}, {"name": "platform", "description": "Social platform (Twitter, LinkedIn, etc.)", "type": "string", "required": true}, {"name": "goal", "description": "Goal (engagement, traffic, awareness)", "type": "string", "required": false, "default": "engagement"}, {"name": "include_hashtags", "description": "Include hashtags?", "type": "boolean", "required": false, "default": true}, {"name": "count", "description": "Number of variations", "type": "number", "required": false, "default": 3}, {"name": "brand_voice", "description": "Brand voice notes", "type": "string", "required": false}]'::jsonb,
'["Understand platform requirements", "Identify compelling angles", "Write hook variations", "Optimize for engagement", "Add relevant hashtags"]'::jsonb,
'markdown'
FROM ai_agents WHERE slug = 'marketer'
ON CONFLICT (agent_id, slug) DO UPDATE SET template = EXCLUDED.template, updated_at = NOW();

-- Developer Templates
INSERT INTO ai_agent_prompts (agent_id, slug, name, description, category, template, variables, reasoning_steps, output_format)
SELECT id, 'code_review', 'Code Review', 'Reviews code for quality and best practices', 'review',
'Review this {{language}} code:

```{{language}}
{{code}}
```

Context: {{context}}
Focus areas: {{focus_areas}}

Analyze for:
1. Correctness and logic
2. Security vulnerabilities
3. Performance issues
4. Code quality and readability
5. Test coverage suggestions
6. Best practices adherence

Provide specific line-by-line feedback where applicable.',
'[{"name": "code", "description": "Code to review", "type": "string", "required": true}, {"name": "language", "description": "Programming language", "type": "string", "required": true}, {"name": "context", "description": "Context about the code", "type": "string", "required": false}, {"name": "focus_areas", "description": "Specific areas to focus on", "type": "string", "required": false}]'::jsonb,
'["Parse and understand code", "Check correctness", "Analyze security", "Evaluate performance", "Review readability", "Assess test needs", "Check standards compliance", "Formulate recommendations"]'::jsonb,
'markdown'
FROM ai_agents WHERE slug = 'developer'
ON CONFLICT (agent_id, slug) DO UPDATE SET template = EXCLUDED.template, updated_at = NOW();

INSERT INTO ai_agent_prompts (agent_id, slug, name, description, category, template, variables, reasoning_steps, output_format)
SELECT id, 'create_pr', 'Create Pull Request', 'Creates a PR with code changes', 'action',
'Create a pull request for: {{description}}

Repository: {{repo}}
Base branch: {{base_branch}}
Target: {{target_description}}

Changes needed:
{{changes}}

Please provide:
1. PR title (conventional commit format)
2. PR description with context
3. Code changes (diff format)
4. Testing recommendations
5. Reviewer notes',
'[{"name": "description", "description": "What the PR accomplishes", "type": "string", "required": true}, {"name": "repo", "description": "Repository name", "type": "string", "required": true}, {"name": "base_branch", "description": "Base branch", "type": "string", "required": false, "default": "main"}, {"name": "target_description", "description": "What code to modify", "type": "string", "required": true}, {"name": "changes", "description": "Detailed changes needed", "type": "string", "required": true}]'::jsonb,
'["Understand requirements", "Identify files to change", "Plan code modifications", "Write clean code", "Create PR description", "Add testing notes"]'::jsonb,
'markdown'
FROM ai_agents WHERE slug = 'developer'
ON CONFLICT (agent_id, slug) DO UPDATE SET template = EXCLUDED.template, updated_at = NOW();

-- SEO Writer Templates
INSERT INTO ai_agent_prompts (agent_id, slug, name, description, category, template, variables, reasoning_steps, output_format)
SELECT id, 'keyword_research', 'Keyword Research', 'Researches keywords for a topic', 'analysis',
'Perform keyword research for: {{topic}}

Industry: {{industry}}
Target audience: {{audience}}
Content type: {{content_type}}
Competitor URLs (optional): {{competitors}}

Deliverables:
1. Primary keywords (3-5)
2. Secondary keywords (5-10)
3. Long-tail keywords (10+)
4. Question keywords for FAQ
5. Content gap opportunities

For each keyword include:
- Estimated search volume range
- Competition level
- Search intent
- Content recommendation',
'[{"name": "topic", "description": "Topic for keyword research", "type": "string", "required": true}, {"name": "industry", "description": "Industry context", "type": "string", "required": true}, {"name": "audience", "description": "Target audience", "type": "string", "required": false}, {"name": "content_type", "description": "Type of content planning", "type": "string", "required": false, "default": "blog"}, {"name": "competitors", "description": "Competitor URLs to analyze", "type": "string", "required": false}]'::jsonb,
'["Identify seed keywords", "Expand to related terms", "Analyze search intent", "Assess competition", "Find long-tail opportunities", "Prioritize by potential"]'::jsonb,
'markdown'
FROM ai_agents WHERE slug = 'seo_writer'
ON CONFLICT (agent_id, slug) DO UPDATE SET template = EXCLUDED.template, updated_at = NOW();

INSERT INTO ai_agent_prompts (agent_id, slug, name, description, category, template, variables, reasoning_steps, output_format)
SELECT id, 'seo_audit', 'SEO Content Audit', 'Audits content for SEO optimization', 'analysis',
'Audit this content for SEO:

URL: {{url}}
Primary keyword: {{keyword}}
Current title: {{title}}
Current meta: {{meta_description}}

Content:
{{content}}

Analyze:
1. Keyword usage and placement
2. Title tag optimization
3. Meta description effectiveness
4. Header structure (H1, H2, H3)
5. Content depth and comprehensiveness
6. Internal linking opportunities
7. Technical SEO issues
8. Featured snippet potential

Provide specific recommendations with examples.',
'[{"name": "url", "description": "Page URL", "type": "string", "required": false}, {"name": "keyword", "description": "Target keyword", "type": "string", "required": true}, {"name": "title", "description": "Current page title", "type": "string", "required": false}, {"name": "meta_description", "description": "Current meta description", "type": "string", "required": false}, {"name": "content", "description": "Page content to audit", "type": "string", "required": true}]'::jsonb,
'["Analyze keyword usage", "Review title tag", "Check meta description", "Evaluate header structure", "Assess content depth", "Find linking opportunities", "Check technical issues", "Identify snippet potential"]'::jsonb,
'markdown'
FROM ai_agents WHERE slug = 'seo_writer'
ON CONFLICT (agent_id, slug) DO UPDATE SET template = EXCLUDED.template, updated_at = NOW();

-- Designer Templates
INSERT INTO ai_agent_prompts (agent_id, slug, name, description, category, template, variables, reasoning_steps, output_format)
SELECT id, 'ui_review', 'UI/UX Review', 'Reviews a page or component design', 'review',
'Review the UI/UX of: {{page_name}}

Screenshot/URL: {{screenshot_url}}
Component type: {{component_type}}
Target users: {{target_users}}

Analyze:
1. Visual hierarchy and layout
2. Typography and readability
3. Color usage and contrast
4. Spacing and alignment
5. Component consistency
6. Interaction patterns
7. Accessibility (WCAG 2.1)
8. Responsive behavior
9. Loading/empty states

Provide specific recommendations with Quasar component suggestions.',
'[{"name": "page_name", "description": "Name of page/component", "type": "string", "required": true}, {"name": "screenshot_url", "description": "URL to screenshot or live page", "type": "string", "required": false}, {"name": "component_type", "description": "Type (page, modal, form, etc.)", "type": "string", "required": false}, {"name": "target_users", "description": "Target user description", "type": "string", "required": false}]'::jsonb,
'["Analyze visual hierarchy", "Evaluate typography", "Check color usage", "Review spacing", "Assess consistency", "Check interactions", "Audit accessibility", "Test responsive"]'::jsonb,
'markdown'
FROM ai_agents WHERE slug = 'designer'
ON CONFLICT (agent_id, slug) DO UPDATE SET template = EXCLUDED.template, updated_at = NOW();

INSERT INTO ai_agent_prompts (agent_id, slug, name, description, category, template, variables, reasoning_steps, output_format)
SELECT id, 'responsive_test', 'Responsive Testing', 'Tests responsive behavior across viewports', 'review',
'Test responsive behavior for: {{page_name}}

URL: {{url}}
Critical breakpoints to check:
- Mobile (xs): 375px
- Tablet (sm): 768px
- Laptop (md): 1024px
- Desktop (lg): 1440px
- Large (xl): 1920px

Check for:
1. Layout shifts and breaking
2. Text overflow and truncation
3. Image scaling
4. Navigation usability
5. Touch target sizes (mobile)
6. Form usability
7. Modal/dialog behavior
8. Table responsiveness

Priority issues: {{priority_areas}}',
'[{"name": "page_name", "description": "Name of page to test", "type": "string", "required": true}, {"name": "url", "description": "URL to test", "type": "string", "required": true}, {"name": "priority_areas", "description": "Specific areas to prioritize", "type": "string", "required": false}]'::jsonb,
'["Test each breakpoint", "Check layout behavior", "Verify text handling", "Test images", "Check navigation", "Verify touch targets", "Test forms", "Check modals", "Review tables"]'::jsonb,
'markdown'
FROM ai_agents WHERE slug = 'designer'
ON CONFLICT (agent_id, slug) DO UPDATE SET template = EXCLUDED.template, updated_at = NOW();


-- ============================================
-- Create Default AI Co-Founders Dashboard
-- ============================================
INSERT INTO directus_dashboards (id, name, icon, note, color)
VALUES (
  'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
  'AI Co-Founders',
  'groups',
  'Multi-agent AI Co-Founders dashboard with specialized agents for research, marketing, development, SEO, and design.',
  '#6366F1'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  note = EXCLUDED.note;

-- Note: Panel configurations will be added after extensions are built
