/**
 * Custom Node-RED Nodes Tests
 * 
 * Tests for the synthstack-* custom nodes
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const NODES_DIR = join(__dirname, '../../packages/node-red-contrib-synthstack/nodes');

describe('Custom Node-RED Nodes', () => {
  const expectedNodes = [
    'synthstack-agent',
    'synthstack-directus',
    'synthstack-copilot',
    'synthstack-trigger',
    'synthstack-github',
    'synthstack-approval',
    'synthstack-email',
    'synthstack-stripe',
  ];

  describe('Node Files Exist', () => {
    expectedNodes.forEach(nodeName => {
      it(`should have ${nodeName}.js file`, () => {
        const jsPath = join(NODES_DIR, `${nodeName}.js`);
        expect(existsSync(jsPath)).toBe(true);
      });

      it(`should have ${nodeName}.html file`, () => {
        const htmlPath = join(NODES_DIR, `${nodeName}.html`);
        expect(existsSync(htmlPath)).toBe(true);
      });
    });
  });

  describe('Node Registration', () => {
    expectedNodes.forEach(nodeName => {
      it(`${nodeName}.js should export a function`, () => {
        const jsPath = join(NODES_DIR, `${nodeName}.js`);
        const content = readFileSync(jsPath, 'utf-8');
        expect(content).toContain('module.exports = function(RED)');
      });

      it(`${nodeName}.js should register the node type`, () => {
        const jsPath = join(NODES_DIR, `${nodeName}.js`);
        const content = readFileSync(jsPath, 'utf-8');
        expect(content).toContain(`RED.nodes.registerType('${nodeName}'`);
      });
    });
  });

  describe('HTML Templates', () => {
    expectedNodes.forEach(nodeName => {
      it(`${nodeName}.html should have registration script`, () => {
        const htmlPath = join(NODES_DIR, `${nodeName}.html`);
        const content = readFileSync(htmlPath, 'utf-8');
        expect(content).toContain('RED.nodes.registerType');
        expect(content).toContain(`'${nodeName}'`);
      });

      it(`${nodeName}.html should have template script`, () => {
        const htmlPath = join(NODES_DIR, `${nodeName}.html`);
        const content = readFileSync(htmlPath, 'utf-8');
        expect(content).toContain(`data-template-name="${nodeName}"`);
      });

      it(`${nodeName}.html should have help script`, () => {
        const htmlPath = join(NODES_DIR, `${nodeName}.html`);
        const content = readFileSync(htmlPath, 'utf-8');
        expect(content).toContain(`data-help-name="${nodeName}"`);
      });

      it(`${nodeName}.html should set category to SynthStack`, () => {
        const htmlPath = join(NODES_DIR, `${nodeName}.html`);
        const content = readFileSync(htmlPath, 'utf-8');
        expect(content).toContain("category: 'SynthStack'");
      });
    });
  });

  describe('Node Configuration', () => {
    it('synthstack-agent should have agent selection', () => {
      const htmlPath = join(NODES_DIR, 'synthstack-agent.html');
      const content = readFileSync(htmlPath, 'utf-8');
      expect(content).toContain('node-input-agent');
    });

    it('synthstack-directus should have operation selection', () => {
      const htmlPath = join(NODES_DIR, 'synthstack-directus.html');
      const content = readFileSync(htmlPath, 'utf-8');
      expect(content).toContain('node-input-operation');
      expect(content).toContain('node-input-collection');
    });

    it('synthstack-trigger should have event selection', () => {
      const htmlPath = join(NODES_DIR, 'synthstack-trigger.html');
      const content = readFileSync(htmlPath, 'utf-8');
      expect(content).toContain('node-input-event');
    });

    it('synthstack-approval should have timeout config', () => {
      const htmlPath = join(NODES_DIR, 'synthstack-approval.html');
      const content = readFileSync(htmlPath, 'utf-8');
      expect(content).toContain('node-input-timeout');
    });

    it('synthstack-email should have recipient config', () => {
      const htmlPath = join(NODES_DIR, 'synthstack-email.html');
      const content = readFileSync(htmlPath, 'utf-8');
      expect(content).toContain('node-input-to');
      expect(content).toContain('node-input-subject');
    });

    it('synthstack-stripe should have operation selection', () => {
      const htmlPath = join(NODES_DIR, 'synthstack-stripe.html');
      const content = readFileSync(htmlPath, 'utf-8');
      expect(content).toContain('node-input-operation');
    });

    it('synthstack-github should have operation and repo config', () => {
      const htmlPath = join(NODES_DIR, 'synthstack-github.html');
      const content = readFileSync(htmlPath, 'utf-8');
      expect(content).toContain('node-input-operation');
      expect(content).toContain('node-input-owner');
      expect(content).toContain('node-input-repo');
    });
  });

  describe('Node Outputs', () => {
    it('all nodes should have dual outputs (success/error)', () => {
      expectedNodes.forEach(nodeName => {
        const htmlPath = join(NODES_DIR, `${nodeName}.html`);
        const content = readFileSync(htmlPath, 'utf-8');
        expect(content).toContain('outputs: 2');
      });
    });

    it('all nodes should have output labels', () => {
      expectedNodes.forEach(nodeName => {
        const htmlPath = join(NODES_DIR, `${nodeName}.html`);
        const content = readFileSync(htmlPath, 'utf-8');
        expect(content).toContain('outputLabels');
      });
    });
  });

  describe('Error Handling', () => {
    expectedNodes.forEach(nodeName => {
      it(`${nodeName}.js should handle errors gracefully`, () => {
        const jsPath = join(NODES_DIR, `${nodeName}.js`);
        const content = readFileSync(jsPath, 'utf-8');
        expect(content).toContain('try {');
        expect(content).toContain('catch');
        expect(content).toContain('node.status');
      });
    });
  });

  describe('Status Updates', () => {
    expectedNodes.forEach(nodeName => {
      it(`${nodeName}.js should update status on processing`, () => {
        const jsPath = join(NODES_DIR, `${nodeName}.js`);
        const content = readFileSync(jsPath, 'utf-8');
        expect(content).toContain("shape: 'dot'");
      });

      it(`${nodeName}.js should show green status on success`, () => {
        const jsPath = join(NODES_DIR, `${nodeName}.js`);
        const content = readFileSync(jsPath, 'utf-8');
        expect(content).toContain("fill: 'green'");
      });

      it(`${nodeName}.js should show red status on error`, () => {
        const jsPath = join(NODES_DIR, `${nodeName}.js`);
        const content = readFileSync(jsPath, 'utf-8');
        expect(content).toContain("fill: 'red'");
      });
    });
  });
});

describe('Package Configuration', () => {
  const packagePath = join(__dirname, '../../packages/node-red-contrib-synthstack/package.json');

  it('should have valid package.json', () => {
    expect(existsSync(packagePath)).toBe(true);
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    expect(pkg.name).toBe('node-red-contrib-synthstack');
  });

  it('should have node-red keyword', () => {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    expect(pkg.keywords).toContain('node-red');
  });

  it('should register all nodes in node-red section', () => {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    expect(pkg['node-red']).toBeDefined();
    expect(pkg['node-red'].nodes).toBeDefined();
    
    const registeredNodes = Object.keys(pkg['node-red'].nodes);
    expect(registeredNodes).toContain('synthstack-agent');
    expect(registeredNodes).toContain('synthstack-directus');
  });
});

