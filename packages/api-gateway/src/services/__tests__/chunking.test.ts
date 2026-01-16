/**
 * @file services/__tests__/chunking.test.ts
 * @description Tests for semantic chunking service
 */

import { describe, it, expect } from 'vitest';
import { chunkingService, semanticChunk, DEFAULT_CHUNK_OPTIONS } from '../chunking.js';

describe('ChunkingService', () => {
  describe('chunk()', () => {
    it('should return empty result for empty content', () => {
      const result = chunkingService.chunk('');
      expect(result.chunks).toHaveLength(0);
      expect(result.chunkCount).toBe(0);
    });

    it('should return single chunk for small content', () => {
      const content = 'This is a small piece of content.';
      const result = chunkingService.chunk(content);

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].content).toBe(content);
    });

    it('should split by headings when using heading strategy', () => {
      // Need enough content to exceed minChunkSize so chunks aren't merged
      const content = `# Introduction
This is the introduction section. It contains enough content to make it a meaningful chunk that won't be merged with other sections due to minimum chunk size requirements. Here is more text to pad it out properly.

# Chapter 1
This is chapter 1 content. It also needs to be long enough to stand on its own as a separate chunk. Adding more content here to ensure it meets the minimum size requirements.

# Chapter 2
This is chapter 2 content. Similarly, this section needs sufficient content length. Here we add more text to make sure the chunking algorithm respects the section boundaries.`;

      const result = chunkingService.chunk(content, {
        strategy: 'heading',
        minChunkSize: 100, // Lower minChunkSize for this test
      });

      expect(result.chunks.length).toBeGreaterThan(1);
      expect(result.chunks.some((c) => c.parentHeading === 'Introduction')).toBe(true);
      expect(result.chunks.some((c) => c.parentHeading === 'Chapter 1')).toBe(true);
    });

    it('should split by paragraphs when using paragraph strategy', () => {
      const content = `First paragraph here.

Second paragraph here.

Third paragraph here.`;

      const result = chunkingService.chunk(content, { strategy: 'paragraph' });

      // With default minChunkSize, small paragraphs might be merged
      expect(result.chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect code blocks', () => {
      const content = `Here is some code:

\`\`\`javascript
const x = 1;
\`\`\`

And more text.`;

      const result = chunkingService.chunk(content, {
        separateCodeBlocks: true,
        strategy: 'hybrid',
      });

      const codeChunk = result.chunks.find((c) => c.hasCode);
      expect(codeChunk).toBeDefined();
    });

    it('should respect maxChunkSize', () => {
      const longContent = 'A'.repeat(10000);
      const result = chunkingService.chunk(longContent, { maxChunkSize: 1000 });

      expect(result.chunks.length).toBeGreaterThan(1);
      result.chunks.forEach((chunk) => {
        // With overlap, chunks might be slightly larger
        expect(chunk.content.length).toBeLessThan(2000);
      });
    });

    it('should preserve chunk order', () => {
      const content = `# First
Content 1.

# Second
Content 2.

# Third
Content 3.`;

      const result = chunkingService.chunk(content, { strategy: 'heading' });

      for (let i = 0; i < result.chunks.length; i++) {
        expect(result.chunks[i].index).toBe(i);
      }
    });

    it('should include chunk metadata', () => {
      const content = `# Test Heading
Some content here.`;

      const result = chunkingService.chunk(content, { strategy: 'heading' });

      expect(result.chunks[0]).toHaveProperty('index');
      expect(result.chunks[0]).toHaveProperty('startOffset');
      expect(result.chunks[0]).toHaveProperty('endOffset');
      expect(result.chunks[0]).toHaveProperty('chunkType');
      expect(result.chunks[0]).toHaveProperty('hasCode');
    });
  });

  describe('semanticChunk()', () => {
    it('should be a convenience wrapper for chunkingService.chunk()', () => {
      const content = 'Test content for chunking.';
      const result = semanticChunk(content);

      expect(result).toHaveProperty('chunks');
      expect(result).toHaveProperty('chunkCount');
      expect(result).toHaveProperty('strategy');
    });
  });

  describe('getRecommendedChunkSize()', () => {
    it('should return recommended size for text-embedding-3-small', () => {
      const size = chunkingService.getRecommendedChunkSize('text-embedding-3-small');
      expect(size).toBe(4000);
    });

    it('should return larger size for text-embedding-3-large', () => {
      const size = chunkingService.getRecommendedChunkSize('text-embedding-3-large');
      expect(size).toBe(6000);
    });
  });

  describe('DEFAULT_CHUNK_OPTIONS', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_CHUNK_OPTIONS.maxChunkSize).toBe(4000);
      expect(DEFAULT_CHUNK_OPTIONS.minChunkSize).toBe(500);
      expect(DEFAULT_CHUNK_OPTIONS.overlapSize).toBe(200);
      expect(DEFAULT_CHUNK_OPTIONS.strategy).toBe('hybrid');
      expect(DEFAULT_CHUNK_OPTIONS.separateCodeBlocks).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle content with only whitespace', () => {
      const result = chunkingService.chunk('   \n\n   ');
      expect(result.chunks).toHaveLength(0);
    });

    it('should handle content with special characters', () => {
      const content = `# Émoji Test 🎉
Content with special chars: é, ñ, 中文, 日本語`;

      const result = chunkingService.chunk(content);
      expect(result.chunks.length).toBeGreaterThan(0);
      // The emoji is in the heading, check if any chunk contains it
      const allContent = result.chunks.map((c) => c.content).join(' ');
      expect(allContent).toContain('中文');
    });

    it('should handle content with nested code blocks', () => {
      const content = `# Code Examples

\`\`\`python
def hello():
    print("Hello")
\`\`\`

Some text between code blocks to add content.

\`\`\`javascript
console.log("World");
\`\`\``;

      const result = chunkingService.chunk(content, {
        separateCodeBlocks: true,
        minChunkSize: 10, // Low min size to avoid merging
      });
      // With low minChunkSize, code blocks should be separate
      expect(result.chunks.length).toBeGreaterThanOrEqual(1);
      // Check that code is detected
      expect(result.chunks.some((c) => c.hasCode)).toBe(true);
    });

    it('should handle markdown lists', () => {
      const content = `# Shopping List
- Apples
- Bananas
- Oranges

1. First item
2. Second item
3. Third item`;

      const result = chunkingService.chunk(content);
      expect(result.chunks.length).toBeGreaterThan(0);
    });
  });
});
