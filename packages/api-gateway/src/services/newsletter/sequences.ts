import type { FastifyInstance } from 'fastify';

export const SEQUENCES = {
  welcome: { name: 'Welcome Series', steps: [
    { id: 'w1', name: 'Welcome', delayDays: 0, subject: 'Welcome!', html: '<h1>Welcome to Printverse!</h1>' },
    { id: 'w2', name: 'Guide', delayDays: 2, subject: 'Quick Start', html: '<h1>Getting Started</h1>' },
  ]},
  trial_ending: { name: 'Trial Ending', steps: [
    { id: 't1', name: '7 Days', delayDays: 0, subject: '7 Days Left', html: '<p>Trial ends soon</p>' },
  ]},
};

export async function processSequenceEnrollments(fastify: FastifyInstance) {
  let processed = 0;
  const result = await fastify.pg.query('SELECT e.id, e.sequence_id, e.current_step, s.slug, sub.email FROM newsletter_sequence_enrollments e JOIN newsletter_sequences s ON e.sequence_id = s.id JOIN newsletter_subscribers sub ON e.subscriber_id = sub.id WHERE e.status = $1 AND e.next_step_at <= NOW()', ['active']);
  for (const enrollment of result.rows) {
    const sequence = SEQUENCES[enrollment.slug as keyof typeof SEQUENCES];
    if (!sequence) continue;
    const step = sequence.steps[enrollment.current_step];
    if (!step) { await fastify.pg.query('UPDATE newsletter_sequence_enrollments SET status = $1, completed_at = NOW() WHERE id = $2', ['completed', enrollment.id]); continue; }
    const nextStep = enrollment.current_step + 1;
    const nextStepAt = sequence.steps[nextStep] ? new Date(Date.now() + sequence.steps[nextStep].delayDays * 86400000) : null;
    await fastify.pg.query('UPDATE newsletter_sequence_enrollments SET current_step = $1, next_step_at = $2 WHERE id = $3', [nextStep, nextStepAt, enrollment.id]);
    processed++;
  }
  return processed;
}
