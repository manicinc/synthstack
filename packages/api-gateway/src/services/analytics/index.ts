import type { FastifyInstance } from 'fastify';
import { AnalyticsTracker, createTracker, TrackEventData } from './tracker.js';
import { AnalyticsAggregator } from './aggregator.js';
import { computeFunnel } from './funnels.js';
import { computeCohort } from './cohorts.js';
import { executeReport } from './reports.js';
import { createExport, processExport } from './exports.js';

export * from './tracker.js';
export { AnalyticsAggregator } from './aggregator.js';
export { computeFunnel } from './funnels.js';
export { computeCohort } from './cohorts.js';
export { executeReport } from './reports.js';
export { createExport, processExport } from './exports.js';

export class AnalyticsService {
  public tracker: AnalyticsTracker;
  public aggregator: AnalyticsAggregator;

  constructor(private fastify: FastifyInstance) {
    this.tracker = createTracker(fastify);
    this.aggregator = new AnalyticsAggregator(fastify);
  }

  async track(data: TrackEventData) { return this.tracker.track(data); }
  async aggregateDaily(date?: Date) { return this.aggregator.aggregateDaily(date); }
  async aggregateHourly() { return this.aggregator.aggregateHourly(); }
  async computeFunnel(funnelId: string) { return computeFunnel(this.fastify, funnelId); }
  async computeCohort(cohortId: string) { return computeCohort(this.fastify, cohortId); }
  async executeReport(reportId: string) { return executeReport(this.fastify, reportId); }
  async createExport(config: any) { return createExport(this.fastify, config); }
  async processExport(exportId: string) { return processExport(this.fastify, exportId); }
}

let analyticsServiceInstance: AnalyticsService | null = null;
export function initAnalyticsService(fastify: FastifyInstance) {
  if (!analyticsServiceInstance) analyticsServiceInstance = new AnalyticsService(fastify);
  return analyticsServiceInstance;
}
export function getAnalyticsService() {
  if (!analyticsServiceInstance) throw new Error('Analytics service not initialized');
  return analyticsServiceInstance;
}
export default AnalyticsService;
