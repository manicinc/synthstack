/**
 * @file services/email/renderer.ts
 * @description Email template rendering utilities
 */

import ejs from 'ejs';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Render email template from file
 * 
 * @param templateName - Template filename (without .ejs)
 * @param data - Template data
 * @returns Rendered HTML
 */
export async function renderEmailTemplate(
  templateName: string,
  data: Record<string, any>
): Promise<string> {
  const templatePath = join(__dirname, 'templates', `${templateName}.ejs`);
  const template = await readFile(templatePath, 'utf-8');
  return ejs.render(template, data);
}

/**
 * Preview template with sample data (for testing)
 * 
 * @param templateName - Template name
 * @param sampleData - Sample template data
 * @returns Rendered HTML preview
 */
export async function previewTemplate(
  templateName: string,
  sampleData?: Record<string, any>
): Promise<string> {
  const defaultData = {
    userName: 'John Doe',
    userEmail: 'john@example.com',
    siteUrl: 'https://synthstack.app',
    dashboardUrl: 'https://synthstack.app/app',
    supportUrl: 'https://synthstack.app/contact',
    unsubscribeUrl: 'https://synthstack.app/unsubscribe',
    ...sampleData,
  };

  return renderEmailTemplate(templateName, defaultData);
}
