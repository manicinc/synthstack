/**
 * Task Classifier Tests
 *
 * Tests for prompt classification, complexity estimation, and tier recommendation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskClassifier, taskClassifier, classifyTask } from '../classifier.js';
import type { ChatMessage, TaskType, ModelTier } from '../types.js';

describe('TaskClassifier', () => {
  let classifier: TaskClassifier;

  beforeEach(() => {
    classifier = new TaskClassifier();
  });

  // ============================================
  // Task Type Detection
  // ============================================

  describe('Task Type Detection', () => {
    describe('Classification Tasks', () => {
      it('should detect classification task from "classify" keyword', () => {
        const result = classifier.classify('Classify this text as positive or negative');
        expect(result.taskType).toBe('classification');
      });

      it('should detect classification task from "categorize" keyword', () => {
        const result = classifier.classify('Categorize these items into groups');
        expect(result.taskType).toBe('classification');
      });

      it('should detect classification task from "is this" pattern', () => {
        const result = classifier.classify('Is this email spam or not?');
        expect(result.taskType).toBe('classification');
      });

      it('should detect classification task from "true or false" pattern', () => {
        const result = classifier.classify('True or false: The earth is round');
        expect(result.taskType).toBe('classification');
      });

      it('should detect classification from sentiment keywords', () => {
        const result = classifier.classify('What is the sentiment of this review?');
        expect(result.taskType).toBe('classification');
      });
    });

    describe('Generation Tasks', () => {
      it('should detect generation task from "write" keyword', () => {
        const result = classifier.classify('Write a blog post about AI');
        expect(result.taskType).toBe('generation');
      });

      it('should detect generation task from "create" keyword', () => {
        const result = classifier.classify('Create an email for my manager');
        expect(result.taskType).toBe('generation');
      });

      it('should detect generation task from "compose" keyword', () => {
        const result = classifier.classify('Compose a marketing description');
        expect(result.taskType).toBe('generation');
      });

      it('should detect generation task from content type keywords', () => {
        const result = classifier.classify('I need a blog post about technology');
        expect(result.taskType).toBe('generation');
      });
    });

    describe('Reasoning Tasks', () => {
      it('should detect reasoning task from "explain" keyword', () => {
        const result = classifier.classify('Explain why this algorithm is efficient');
        expect(result.taskType).toBe('reasoning');
      });

      it('should detect reasoning task from "analyze" keyword', () => {
        const result = classifier.classify('Analyze the pros and cons of this approach');
        expect(result.taskType).toBe('reasoning');
      });

      it('should detect reasoning task from "compare" keyword', () => {
        const result = classifier.classify('Compare React and Vue frameworks');
        expect(result.taskType).toBe('reasoning');
      });

      it('should detect reasoning task from strategy keywords', () => {
        const result = classifier.classify('What strategy should I use for this problem?');
        expect(result.taskType).toBe('reasoning');
      });
    });

    describe('Coding Tasks', () => {
      it('should detect coding task from "code" keyword', () => {
        const result = classifier.classify('Write code for a sorting algorithm');
        expect(result.taskType).toBe('coding');
      });

      it('should detect coding task from language names', () => {
        const result = classifier.classify('How do I implement this in TypeScript?');
        expect(result.taskType).toBe('coding');
      });

      it('should detect coding task from code blocks', () => {
        const result = classifier.classify('Fix this bug:\n```javascript\nconsole.log("test")\n```');
        expect(result.taskType).toBe('coding');
      });

      it('should detect coding task from "debug" keyword', () => {
        const result = classifier.classify('Debug this function for me');
        expect(result.taskType).toBe('coding');
      });

      it('should detect coding task from "refactor" keyword', () => {
        const result = classifier.classify('Refactor this code to be more efficient');
        expect(result.taskType).toBe('coding');
      });
    });

    describe('Conversation Tasks', () => {
      it('should detect conversation task from greeting', () => {
        const result = classifier.classify('Hello! How are you today?');
        expect(result.taskType).toBe('conversation');
      });

      it('should detect conversation task from "help me" pattern', () => {
        const result = classifier.classify('Can you help me with something?');
        expect(result.taskType).toBe('conversation');
      });

      it('should default to conversation for ambiguous input', () => {
        const result = classifier.classify('What is the weather like?');
        expect(result.taskType).toBe('conversation');
      });
    });

    describe('Summarization Tasks', () => {
      it('should detect summarization task from "summarize" keyword', () => {
        // Avoid "please" which triggers conversation pattern
        const result = classifier.classify('Summarize the following text for brevity');
        expect(result.taskType).toBe('summarization');
      });

      it('should detect summarization task from "tldr" keyword', () => {
        // Use multiple summarization keywords to outscore conversation
        const result = classifier.classify('Provide a tldr summary of this');
        expect(result.taskType).toBe('summarization');
      });

      it('should detect summarization task from "key points" keyword', () => {
        // "key points" is a strong summarization indicator
        const result = classifier.classify('List the main points and key points');
        expect(result.taskType).toBe('summarization');
      });
    });

    describe('Extraction Tasks', () => {
      it('should detect extraction task from "extract" keyword', () => {
        // Use a prompt focused on extraction without generation keywords
        const result = classifier.classify('Extract the entities from this');
        expect(result.taskType).toBe('extraction');
      });

      it('should detect extraction task from "parse" keyword', () => {
        const result = classifier.classify('Parse and identify the data');
        expect(result.taskType).toBe('extraction');
      });

      it('should detect extraction task from entity keywords', () => {
        const result = classifier.classify('Identify all entities and names');
        expect(result.taskType).toBe('extraction');
      });
    });
  });

  // ============================================
  // Complexity Estimation
  // ============================================

  describe('Complexity Estimation', () => {
    it('should detect high complexity from "complex" keyword', () => {
      const result = classifier.classify('Explain this complex algorithm in detail');
      expect(result.estimatedComplexity).toBe('high');
    });

    it('should detect high complexity from "comprehensive" keyword', () => {
      const result = classifier.classify('Give me a comprehensive analysis');
      expect(result.estimatedComplexity).toBe('high');
    });

    it('should detect high complexity from "architecture" keyword', () => {
      const result = classifier.classify('Design the system architecture');
      expect(result.estimatedComplexity).toBe('high');
    });

    it('should detect low complexity from "simple" keyword', () => {
      const result = classifier.classify('Give me a simple answer');
      expect(result.estimatedComplexity).toBe('low');
    });

    it('should detect low complexity from "yes or no" pattern', () => {
      const result = classifier.classify('Yes or no: Is this correct?');
      expect(result.estimatedComplexity).toBe('low');
    });

    it('should detect low complexity from short prompts', () => {
      const result = classifier.classify('What time is it?');
      expect(result.estimatedComplexity).toBe('low');
    });

    it('should detect medium complexity for neutral prompts', () => {
      const words = Array(100).fill('word').join(' ');
      const result = classifier.classify(`Tell me about ${words}`);
      expect(result.estimatedComplexity).toBe('medium');
    });

    it('should detect high complexity for very long prompts', () => {
      const words = Array(600).fill('word').join(' ');
      const result = classifier.classify(words);
      expect(result.estimatedComplexity).toBe('high');
    });

    it('should detect high complexity for large code blocks', () => {
      const code = '```javascript\n' + 'const x = 1;\n'.repeat(50) + '```';
      const result = classifier.classify(`Review this code: ${code}`);
      expect(result.estimatedComplexity).toBe('high');
    });
  });

  // ============================================
  // Tool Requirement Detection
  // ============================================

  describe('Tool Requirement Detection', () => {
    it('should detect tool requirement from "search" keyword', () => {
      const result = classifier.classify('Search the web for the latest news');
      expect(result.requiresTools).toBe(true);
    });

    it('should detect tool requirement from "fetch" keyword', () => {
      const result = classifier.classify('Fetch the data from this API');
      expect(result.requiresTools).toBe(true);
    });

    it('should detect tool requirement from "execute" keyword', () => {
      const result = classifier.classify('Execute this command');
      expect(result.requiresTools).toBe(true);
    });

    it('should detect tool requirement from "calculate" keyword', () => {
      const result = classifier.classify('Calculate the sum of these numbers');
      expect(result.requiresTools).toBe(true);
    });

    it('should not detect tool requirement for simple questions', () => {
      const result = classifier.classify('What is 2 + 2?');
      expect(result.requiresTools).toBe(false);
    });
  });

  // ============================================
  // JSON Requirement Detection
  // ============================================

  describe('JSON Requirement Detection', () => {
    it('should detect JSON requirement from "json" keyword', () => {
      const result = classifier.classify('Return the result as JSON');
      expect(result.requiresJsonMode).toBe(true);
    });

    it('should detect JSON requirement from "structured" keyword', () => {
      const result = classifier.classify('Give me structured output');
      expect(result.requiresJsonMode).toBe(true);
    });

    it('should detect JSON requirement from JSON structure in prompt', () => {
      const result = classifier.classify('Fill this: {"name": "", "age": ""}');
      expect(result.requiresJsonMode).toBe(true);
    });

    it('should detect JSON requirement from output pattern', () => {
      const result = classifier.classify('Respond with an object containing the data');
      expect(result.requiresJsonMode).toBe(true);
    });

    it('should not detect JSON requirement for plain text requests', () => {
      const result = classifier.classify('Tell me a story');
      expect(result.requiresJsonMode).toBe(false);
    });
  });

  // ============================================
  // Tier Recommendation
  // ============================================

  describe('Tier Recommendation', () => {
    it('should recommend premium tier for high complexity', () => {
      const result = classifier.classifyWithTier('Give me a comprehensive analysis of this complex system architecture');
      expect(result.tier).toBe('premium');
    });

    it('should recommend cheap tier for low complexity classification', () => {
      const result = classifier.classifyWithTier('Is this spam? Yes or no');
      expect(result.tier).toBe('cheap');
    });

    it('should recommend cheap tier for simple extraction', () => {
      const result = classifier.classifyWithTier('Extract the email address briefly');
      expect(result.tier).toBe('cheap');
    });

    it('should recommend cheap tier for simple coding tasks', () => {
      // Short prompts are classified as low complexity
      const result = classifier.classifyWithTier('Write a function to sort an array');
      expect(result.tier).toBe('cheap');
    });

    it('should recommend standard tier for medium complexity conversation', () => {
      const words = Array(100).fill('word').join(' ');
      const result = classifier.classifyWithTier(`Help me with this: ${words}`);
      expect(result.tier).toBe('standard');
    });
  });

  // ============================================
  // Message Array Handling
  // ============================================

  describe('Message Array Handling', () => {
    it('should extract text from message array', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Write code for a sorting algorithm' },
      ];
      const result = classifier.classify(messages);
      expect(result.taskType).toBe('coding');
    });

    it('should combine multiple user messages', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'I need help with code.' },
        { role: 'assistant', content: 'Sure!' },
        { role: 'user', content: 'Write a function in TypeScript' },
      ];
      const result = classifier.classify(messages);
      expect(result.taskType).toBe('coding');
    });

    it('should include system message context', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a code review expert.' },
        { role: 'user', content: 'Review this for bugs' },
      ];
      const result = classifier.classify(messages);
      expect(result.taskType).toBe('coding');
    });
  });

  // ============================================
  // Singleton and Utility Functions
  // ============================================

  describe('Singleton and Utility Functions', () => {
    it('should export singleton instance', () => {
      expect(taskClassifier).toBeInstanceOf(TaskClassifier);
    });

    it('should provide classifyTask utility function', () => {
      const result = classifyTask('Write a blog post');
      expect(result.taskType).toBe('generation');
      expect(result.tier).toBeDefined();
    });

    it('should return consistent results from singleton', () => {
      const result1 = taskClassifier.classify('Explain this algorithm');
      const result2 = taskClassifier.classify('Explain this algorithm');
      expect(result1).toEqual(result2);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = classifier.classify('');
      expect(result.taskType).toBe('conversation');
      expect(result.estimatedComplexity).toBe('low');
    });

    it('should handle empty message array', () => {
      const result = classifier.classify([]);
      expect(result.taskType).toBe('conversation');
    });

    it('should handle mixed case keywords', () => {
      const result = classifier.classify('WRITE A BLOG POST');
      expect(result.taskType).toBe('generation');
    });

    it('should handle multiple competing task types', () => {
      // Should return the highest scoring one
      const result = classifier.classify('Write and analyze code for sorting algorithm with detailed explanation');
      // coding should win with code + algorithm keywords
      expect(['coding', 'reasoning']).toContain(result.taskType);
    });

    it('should handle special characters', () => {
      const result = classifier.classify('What is @#$%^&*() ?');
      expect(result.taskType).toBe('conversation');
    });

    it('should handle unicode text', () => {
      // "write" keyword triggers generation, so test unicode with a summarization-focused prompt
      const result = classifier.classify('Résumé: summarize the following');
      expect(result.taskType).toBe('summarization');
    });
  });
});
