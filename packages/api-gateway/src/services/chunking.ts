/**
 * Semantic Chunking Service
 *
 * Provides intelligent chunking for RAG (Retrieval Augmented Generation) that
 * preserves semantic meaning by respecting document structure:
 * - Splits by headings (H1, H2, H3)
 * - Preserves paragraph boundaries
 * - Falls back to sentence splitting for oversized paragraphs
 * - Adds overlap between chunks for context continuity
 * - Preserves metadata about parent headings and content type
 */

// ============================================
// Types
// ============================================

export interface ChunkOptions {
  /** Maximum characters per chunk (default: 4000) */
  maxChunkSize: number;
  /** Minimum characters per chunk - chunks below this are merged (default: 500) */
  minChunkSize: number;
  /** Characters to overlap between adjacent chunks (default: 200) */
  overlapSize: number;
  /** Chunking strategy to use */
  strategy: ChunkStrategy;
  /** Whether to include code blocks as separate chunks */
  separateCodeBlocks: boolean;
}

export type ChunkStrategy = 'sentence' | 'paragraph' | 'heading' | 'hybrid';

export interface Chunk {
  /** The text content of the chunk */
  content: string;
  /** Zero-based index of this chunk in the document */
  index: number;
  /** Parent heading text if applicable */
  parentHeading?: string;
  /** Heading level (1-6) of the section this chunk belongs to */
  headingLevel?: number;
  /** Whether this chunk contains code blocks */
  hasCode: boolean;
  /** Programming language if this is a code chunk */
  codeLanguage?: string;
  /** Character offset in original document */
  startOffset: number;
  /** Character offset end in original document */
  endOffset: number;
  /** Chunk type for debugging/filtering */
  chunkType: 'text' | 'code' | 'heading' | 'list';
}

export interface ChunkResult {
  /** Array of chunks produced from the document */
  chunks: Chunk[];
  /** Total character count of original document */
  totalCharacters: number;
  /** Number of chunks produced */
  chunkCount: number;
  /** Strategy used for chunking */
  strategy: ChunkStrategy;
}

// ============================================
// Default Options
// ============================================

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  maxChunkSize: 4000,
  minChunkSize: 500,
  overlapSize: 200,
  strategy: 'hybrid',
  separateCodeBlocks: true,
};

// ============================================
// Regex Patterns
// ============================================

// Markdown heading pattern (# to ######)
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/gm;

// Code block pattern (```language ... ```)
const CODE_BLOCK_REGEX = /```(\w*)\n([\s\S]*?)```/g;

// Paragraph separator (blank line)
const PARAGRAPH_REGEX = /\n\s*\n/g;

// Sentence ending pattern (respects abbreviations)
const SENTENCE_REGEX = /(?<=[.!?])\s+(?=[A-Z])/g;

// List item pattern
const LIST_ITEM_REGEX = /^(\s*[-*+]|\s*\d+\.)\s+/gm;

// ============================================
// Chunking Class
// ============================================

class ChunkingService {
  /**
   * Chunk a document using the specified strategy
   */
  chunk(content: string, options: Partial<ChunkOptions> = {}): ChunkResult {
    const opts: ChunkOptions = { ...DEFAULT_CHUNK_OPTIONS, ...options };

    if (!content || content.trim().length === 0) {
      return {
        chunks: [],
        totalCharacters: 0,
        chunkCount: 0,
        strategy: opts.strategy,
      };
    }

    const trimmedContent = content.trim();

    // Choose chunking strategy
    let chunks: Chunk[];
    switch (opts.strategy) {
      case 'heading':
        chunks = this.chunkByHeadings(trimmedContent, opts);
        break;
      case 'paragraph':
        chunks = this.chunkByParagraphs(trimmedContent, opts);
        break;
      case 'sentence':
        chunks = this.chunkBySentences(trimmedContent, opts);
        break;
      case 'hybrid':
      default:
        chunks = this.chunkHybrid(trimmedContent, opts);
        break;
    }

    // Add overlap between chunks
    if (opts.overlapSize > 0 && chunks.length > 1) {
      chunks = this.addOverlap(chunks, opts.overlapSize);
    }

    // Merge small chunks
    chunks = this.mergeSmallChunks(chunks, opts.minChunkSize);

    // Reindex after merging
    chunks = chunks.map((chunk, index) => ({ ...chunk, index }));

    return {
      chunks,
      totalCharacters: trimmedContent.length,
      chunkCount: chunks.length,
      strategy: opts.strategy,
    };
  }

  /**
   * Hybrid chunking strategy - best for markdown documents
   * 1. Extract code blocks first
   * 2. Split remaining content by headings
   * 3. Within sections, split by paragraphs
   * 4. Within paragraphs, split by sentences if too large
   */
  private chunkHybrid(content: string, opts: ChunkOptions): Chunk[] {
    const chunks: Chunk[] = [];
    let currentOffset = 0;

    // Extract and track code blocks
    const codeBlocks: Array<{ start: number; end: number; content: string; language: string }> = [];
    let contentWithPlaceholders = content;

    if (opts.separateCodeBlocks) {
      const codeMatches = Array.from(content.matchAll(CODE_BLOCK_REGEX));
      codeMatches.forEach((match, idx) => {
        const placeholder = `__CODE_BLOCK_${idx}__`;
        codeBlocks.push({
          start: match.index!,
          end: match.index! + match[0].length,
          content: match[2],
          language: match[1] || 'text',
        });
        contentWithPlaceholders = contentWithPlaceholders.replace(match[0], placeholder);
      });
    }

    // Split by headings
    const sections = this.splitByHeadings(contentWithPlaceholders);

    for (const section of sections) {
      // Check for code block placeholders and restore them as separate chunks
      const placeholderMatch = section.content.match(/__CODE_BLOCK_(\d+)__/);
      if (placeholderMatch) {
        const blockIdx = parseInt(placeholderMatch[1]);
        const codeBlock = codeBlocks[blockIdx];
        if (codeBlock) {
          chunks.push({
            content: codeBlock.content,
            index: chunks.length,
            parentHeading: section.heading,
            headingLevel: section.level,
            hasCode: true,
            codeLanguage: codeBlock.language,
            startOffset: codeBlock.start,
            endOffset: codeBlock.end,
            chunkType: 'code',
          });
          continue;
        }
      }

      // Split section content by paragraphs
      const paragraphs = section.content.split(PARAGRAPH_REGEX).filter((p) => p.trim());

      for (const paragraph of paragraphs) {
        const trimmedParagraph = paragraph.trim();

        if (trimmedParagraph.length <= opts.maxChunkSize) {
          chunks.push({
            content: trimmedParagraph,
            index: chunks.length,
            parentHeading: section.heading,
            headingLevel: section.level,
            hasCode: this.hasCodeBlock(trimmedParagraph),
            startOffset: currentOffset,
            endOffset: currentOffset + trimmedParagraph.length,
            chunkType: this.detectChunkType(trimmedParagraph),
          });
          currentOffset += trimmedParagraph.length;
        } else {
          // Paragraph too large - split by sentences
          const sentenceChunks = this.splitBySentences(trimmedParagraph, opts.maxChunkSize);
          for (const sentenceChunk of sentenceChunks) {
            chunks.push({
              content: sentenceChunk,
              index: chunks.length,
              parentHeading: section.heading,
              headingLevel: section.level,
              hasCode: this.hasCodeBlock(sentenceChunk),
              startOffset: currentOffset,
              endOffset: currentOffset + sentenceChunk.length,
              chunkType: 'text',
            });
            currentOffset += sentenceChunk.length;
          }
        }
      }
    }

    return chunks;
  }

  /**
   * Split content by markdown headings
   */
  private splitByHeadings(
    content: string
  ): Array<{ heading?: string; level?: number; content: string }> {
    const sections: Array<{ heading?: string; level?: number; content: string }> = [];
    const headingMatches = Array.from(content.matchAll(HEADING_REGEX));

    if (headingMatches.length === 0) {
      // No headings - return as single section
      return [{ content }];
    }

    let lastIndex = 0;

    // Content before first heading
    const beforeFirst = content.slice(0, headingMatches[0].index!).trim();
    if (beforeFirst) {
      sections.push({ content: beforeFirst });
    }

    for (let i = 0; i < headingMatches.length; i++) {
      const match = headingMatches[i];
      const nextMatch = headingMatches[i + 1];
      const level = match[1].length;
      const heading = match[2].trim();

      const startIndex = match.index! + match[0].length;
      const endIndex = nextMatch ? nextMatch.index! : content.length;
      const sectionContent = content.slice(startIndex, endIndex).trim();

      if (sectionContent) {
        sections.push({
          heading,
          level,
          content: sectionContent,
        });
      }

      lastIndex = endIndex;
    }

    return sections;
  }

  /**
   * Split text by sentences while respecting max size
   */
  private splitBySentences(text: string, maxSize: number): string[] {
    const sentences = text.split(SENTENCE_REGEX);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();

      if (!trimmedSentence) continue;

      if (currentChunk.length + trimmedSentence.length + 1 <= maxSize) {
        currentChunk = currentChunk ? `${currentChunk} ${trimmedSentence}` : trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        // If single sentence is too large, split by character (last resort)
        if (trimmedSentence.length > maxSize) {
          for (let i = 0; i < trimmedSentence.length; i += maxSize) {
            chunks.push(trimmedSentence.slice(i, i + maxSize));
          }
          currentChunk = '';
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Chunk by paragraphs (simple paragraph-based chunking)
   */
  private chunkByParagraphs(content: string, opts: ChunkOptions): Chunk[] {
    const paragraphs = content.split(PARAGRAPH_REGEX).filter((p) => p.trim());
    const chunks: Chunk[] = [];
    let currentOffset = 0;
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();

      if (currentChunk.length + trimmedParagraph.length + 2 <= opts.maxChunkSize) {
        currentChunk = currentChunk
          ? `${currentChunk}\n\n${trimmedParagraph}`
          : trimmedParagraph;
      } else {
        if (currentChunk) {
          chunks.push({
            content: currentChunk,
            index: chunks.length,
            hasCode: this.hasCodeBlock(currentChunk),
            startOffset: currentOffset,
            endOffset: currentOffset + currentChunk.length,
            chunkType: this.detectChunkType(currentChunk),
          });
          currentOffset += currentChunk.length;
        }
        currentChunk = trimmedParagraph;
      }
    }

    if (currentChunk) {
      chunks.push({
        content: currentChunk,
        index: chunks.length,
        hasCode: this.hasCodeBlock(currentChunk),
        startOffset: currentOffset,
        endOffset: currentOffset + currentChunk.length,
        chunkType: this.detectChunkType(currentChunk),
      });
    }

    return chunks;
  }

  /**
   * Chunk by headings only
   */
  private chunkByHeadings(content: string, opts: ChunkOptions): Chunk[] {
    const sections = this.splitByHeadings(content);
    const chunks: Chunk[] = [];
    let currentOffset = 0;

    for (const section of sections) {
      const sectionText = section.heading
        ? `## ${section.heading}\n\n${section.content}`
        : section.content;

      if (sectionText.length <= opts.maxChunkSize) {
        chunks.push({
          content: sectionText,
          index: chunks.length,
          parentHeading: section.heading,
          headingLevel: section.level,
          hasCode: this.hasCodeBlock(sectionText),
          startOffset: currentOffset,
          endOffset: currentOffset + sectionText.length,
          chunkType: section.heading ? 'heading' : 'text',
        });
        currentOffset += sectionText.length;
      } else {
        // Section too large - fall back to paragraph chunking
        const subChunks = this.chunkByParagraphs(section.content, opts);
        for (const subChunk of subChunks) {
          chunks.push({
            ...subChunk,
            index: chunks.length,
            parentHeading: section.heading,
            headingLevel: section.level,
            startOffset: currentOffset,
            endOffset: currentOffset + subChunk.content.length,
          });
          currentOffset += subChunk.content.length;
        }
      }
    }

    return chunks;
  }

  /**
   * Chunk by sentences (most granular)
   */
  private chunkBySentences(content: string, opts: ChunkOptions): Chunk[] {
    const sentences = content.split(SENTENCE_REGEX).filter((s) => s.trim());
    const chunks: Chunk[] = [];
    let currentOffset = 0;
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();

      if (currentChunk.length + trimmedSentence.length + 1 <= opts.maxChunkSize) {
        currentChunk = currentChunk ? `${currentChunk} ${trimmedSentence}` : trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push({
            content: currentChunk,
            index: chunks.length,
            hasCode: this.hasCodeBlock(currentChunk),
            startOffset: currentOffset,
            endOffset: currentOffset + currentChunk.length,
            chunkType: 'text',
          });
          currentOffset += currentChunk.length;
        }
        currentChunk = trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push({
        content: currentChunk,
        index: chunks.length,
        hasCode: this.hasCodeBlock(currentChunk),
        startOffset: currentOffset,
        endOffset: currentOffset + currentChunk.length,
        chunkType: 'text',
      });
    }

    return chunks;
  }

  /**
   * Add overlap between adjacent chunks for context continuity
   */
  private addOverlap(chunks: Chunk[], overlapSize: number): Chunk[] {
    if (chunks.length <= 1) return chunks;

    return chunks.map((chunk, idx) => {
      if (idx === 0) return chunk;

      const prevChunk = chunks[idx - 1];
      const overlapText = prevChunk.content.slice(-overlapSize);

      // Only add overlap if it ends at a word boundary
      const lastSpace = overlapText.lastIndexOf(' ');
      const cleanOverlap = lastSpace > 0 ? overlapText.slice(lastSpace + 1) : overlapText;

      if (cleanOverlap && !chunk.content.startsWith(cleanOverlap)) {
        return {
          ...chunk,
          content: `${cleanOverlap}... ${chunk.content}`,
        };
      }

      return chunk;
    });
  }

  /**
   * Merge consecutive small chunks together
   */
  private mergeSmallChunks(chunks: Chunk[], minSize: number): Chunk[] {
    if (chunks.length <= 1) return chunks;

    const merged: Chunk[] = [];
    let pendingChunk: Chunk | null = null;

    for (const chunk of chunks) {
      if (pendingChunk) {
        // Check if combining would still be reasonable
        if (pendingChunk.content.length + chunk.content.length < minSize * 3) {
          // Create new chunk object explicitly to avoid spread type issues with Chunk | null
          pendingChunk = Object.assign({}, pendingChunk, {
            content: `${pendingChunk.content}\n\n${chunk.content}`,
            endOffset: chunk.endOffset,
            hasCode: pendingChunk.hasCode || chunk.hasCode,
          });
        } else {
          merged.push(pendingChunk);
          pendingChunk = chunk.content.length < minSize ? chunk : null;
          if (!pendingChunk) {
            merged.push(chunk);
          }
        }
      } else {
        if (chunk.content.length < minSize) {
          pendingChunk = chunk;
        } else {
          merged.push(chunk);
        }
      }
    }

    if (pendingChunk) {
      // Merge with last chunk if possible
      if (merged.length > 0) {
        const last = merged[merged.length - 1];
        merged[merged.length - 1] = {
          ...last,
          content: `${last.content}\n\n${pendingChunk.content}`,
          endOffset: pendingChunk.endOffset,
          hasCode: last.hasCode || pendingChunk.hasCode,
        };
      } else {
        merged.push(pendingChunk);
      }
    }

    return merged;
  }

  /**
   * Check if text contains code blocks
   */
  private hasCodeBlock(text: string): boolean {
    return CODE_BLOCK_REGEX.test(text) || text.includes('`');
  }

  /**
   * Detect the type of content in a chunk
   */
  private detectChunkType(text: string): Chunk['chunkType'] {
    if (CODE_BLOCK_REGEX.test(text)) return 'code';
    if (HEADING_REGEX.test(text)) return 'heading';
    if (LIST_ITEM_REGEX.test(text)) return 'list';
    return 'text';
  }

  /**
   * Estimate optimal chunk size based on embedding model
   * For text-embedding-3-small, ~8000 tokens is safe (roughly 32000 chars)
   * But for better retrieval, smaller chunks work better
   */
  getRecommendedChunkSize(model: string = 'text-embedding-3-small'): number {
    // Smaller chunks = better retrieval precision but more API calls
    // Larger chunks = better context but lower precision
    switch (model) {
      case 'text-embedding-3-large':
        return 6000; // Can handle larger context
      case 'text-embedding-3-small':
      default:
        return 4000; // Good balance for most cases
    }
  }
}

// Singleton instance
export const chunkingService = new ChunkingService();

// Convenience function for quick chunking
export function semanticChunk(
  content: string,
  options: Partial<ChunkOptions> = {}
): ChunkResult {
  return chunkingService.chunk(content, options);
}
