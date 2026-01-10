<template>
  <section
    class="agent-showcase"
    aria-labelledby="agents-title"
  >
    <div class="section-container">
      <header class="section-header">
        <div class="badge">
          <q-icon
            name="groups"
            size="18px"
          />
          Meet Your Team
        </div>
        <h2 id="agents-title">
          6 Specialized AI Co-Founders
        </h2>
        <p>
          Not generic chatbots. These are specialized AI agents that understand their domain,
          access your data, and take real action in your business.
        </p>
      </header>

      <div class="agents-grid">
        <AgentCard
          v-for="agent in agents"
          :key="agent.slug"
          :agent="agent"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import AgentCard from './AgentCard.vue'

const agents = [
  {
    slug: 'general',
    name: 'General Assistant',
    icon: 'smart_toy',
    color: '#6366F1',
    description: 'Your versatile AI assistant for general questions, task coordination, and getting started with SynthStack.',
    capabilities: [
      'Answer questions about your business',
      'Coordinate tasks between agents',
      'Provide onboarding guidance',
      'Summarize recent activity',
      'Help plan and prioritize work',
    ],
    outputs: ['Task Plans', 'Summaries', 'Guidance'],
  },
  {
    slug: 'researcher',
    name: 'Researcher',
    icon: 'science',
    color: '#10B981',
    description: 'Deep-dive market research, competitor analysis, and data-driven insights to inform your strategy.',
    capabilities: [
      'Market trend analysis',
      'Competitor research and monitoring',
      'Industry report generation',
      'Data analysis and visualization',
      'SWOT analysis creation',
    ],
    outputs: ['Research Reports', 'Competitor Analysis', 'Market Insights'],
  },
  {
    slug: 'marketer',
    name: 'Marketer',
    icon: 'campaign',
    color: '#F59E0B',
    description: 'Content creation powerhouse. Blog posts, marketing campaigns, social media strategies, and more.',
    capabilities: [
      'Write blog posts and articles',
      'Create marketing campaign plans',
      'Generate social media content',
      'Design email marketing sequences',
      'Craft compelling copy and CTAs',
    ],
    outputs: ['Blog Posts', 'Marketing Plans', 'Social Content', 'Email Campaigns'],
  },
  {
    slug: 'developer',
    name: 'Software Developer',
    icon: 'code',
    color: '#3B82F6',
    description: 'Your technical co-founder. Code review, PR creation, technical guidance, and GitHub integration.',
    capabilities: [
      'Review code and suggest improvements',
      'Create pull requests automatically',
      'Explain complex codebases',
      'Write technical documentation',
      'Debug and troubleshoot issues',
    ],
    outputs: ['Pull Requests', 'Code Reviews', 'Technical Docs', 'Issue Reports'],
  },
  {
    slug: 'seo_writer',
    name: 'SEO Writer',
    icon: 'trending_up',
    color: '#8B5CF6',
    description: 'Search engine optimization expert. Keyword research, content optimization, and ranking improvements.',
    capabilities: [
      'Keyword research and analysis',
      'SEO-optimized content writing',
      'Meta description generation',
      'Internal linking suggestions',
      'Search ranking improvement',
    ],
    outputs: ['SEO Content', 'Keyword Reports', 'Meta Tags', 'Optimization Plans'],
  },
  {
    slug: 'designer',
    name: 'Designer',
    icon: 'palette',
    color: '#EC4899',
    description: 'Visual analysis and UI/UX feedback. Screenshot analysis, responsive testing, and design recommendations.',
    capabilities: [
      'Analyze page screenshots',
      'Check mobile responsiveness',
      'Provide UI/UX feedback',
      'Suggest design improvements',
      'Review accessibility compliance',
    ],
    outputs: ['Design Feedback', 'UX Reports', 'Accessibility Audits'],
  },
]
</script>

<style scoped lang="scss">
.agent-showcase {
  padding: 100px 24px;
  background: var(--bg-subtle);
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(0, 212, 170, 0.15) 100%);
    color: var(--primary);
    padding: 8px 20px;
    border-radius: 24px;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 16px;
  }

  h2 {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 16px;

    @media (max-width: 600px) {
      font-size: 2rem;
    }
  }

  p {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin: 0;
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.6;
  }
}

.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 28px;

  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
}
</style>
