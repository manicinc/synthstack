/**
 * Task Classifier
 * 
 * Analyzes prompts and messages to determine task type and complexity
 * for intelligent model routing.
 */

import type { ChatMessage, TaskType, TaskHint, ModelTier } from './types.js';

// ============================================
// Task Classification Patterns
// ============================================

/**
 * Keywords and patterns for task type detection
 */
const TASK_PATTERNS: Record<TaskType, RegExp[]> = {
  classification: [
    /\b(classify|categorize|label|tag|identify type|what type|which category)\b/i,
    /\b(is this|does this|true or false)\b/i,
    /\b(spam|sentiment|positive|negative)\b/i,
  ],
  generation: [
    /\b(write|create|generate|compose|draft|produce)\b/i,
    /\b(blog post|article|story|email|message|content)\b/i,
    /\b(marketing|copy|description)\b/i,
  ],
  reasoning: [
    /\b(explain|analyze|why|how does|reason|logic|think through)\b/i,
    /\b(compare|contrast|evaluate|assess|critique)\b/i,
    /\b(strategy|plan|approach|solution)\b/i,
    /\b(pros and cons|advantages|disadvantages)\b/i,
  ],
  coding: [
    /\b(code|program|function|class|implement|debug|fix bug)\b/i,
    /\b(javascript|typescript|python|java|rust|go|sql)\b/i,
    /\b(api|endpoint|database|query|algorithm)\b/i,
    /\b(refactor|optimize|review code)\b/i,
    /```[\s\S]*```/, // Code blocks
  ],
  conversation: [
    /\b(hi|hello|hey|thanks|thank you|please)\b/i,
    /\b(help me|can you|could you|would you)\b/i,
    /\b(what is|who is|where is|when is)\b/i,
  ],
  summarization: [
    /\b(summarize|summary|tldr|brief|condense|shorten)\b/i,
    /\b(key points|main points|highlights|overview)\b/i,
  ],
  extraction: [
    /\b(extract|find|identify|locate|get|pull out)\b/i,
    /\b(entities|names|dates|numbers|data)\b/i,
    /\b(parse|structured|json|list)\b/i,
  ],
};

/**
 * Complexity indicators
 */
const COMPLEXITY_INDICATORS = {
  high: [
    /\b(complex|advanced|sophisticated|comprehensive|in-depth)\b/i,
    /\b(multi-step|detailed|thorough|extensive)\b/i,
    /\b(architecture|system design|optimization)\b/i,
    /\b(research|analysis|strategy)\b/i,
  ],
  low: [
    /\b(simple|basic|quick|brief|short)\b/i,
    /\b(yes or no|true or false|one word)\b/i,
    /\b(just|only|simply)\b/i,
  ],
};

// ============================================
// Classifier Class
// ============================================

export class TaskClassifier {
  /**
   * Classify a prompt or message array
   */
  classify(input: string | ChatMessage[]): TaskHint {
    const text = this.extractText(input);
    
    return {
      taskType: this.detectTaskType(text),
      estimatedComplexity: this.estimateComplexity(text),
      requiresTools: this.detectToolRequirement(text),
      requiresJsonMode: this.detectJsonRequirement(text),
    };
  }

  /**
   * Classify and return recommended tier
   */
  classifyWithTier(input: string | ChatMessage[]): TaskHint & { tier: ModelTier } {
    const hint = this.classify(input);
    return {
      ...hint,
      tier: this.recommendTier(hint),
    };
  }

  /**
   * Extract text from input
   */
  private extractText(input: string | ChatMessage[]): string {
    if (typeof input === 'string') {
      return input;
    }
    
    // Combine user messages, prioritizing the last one
    const userMessages = input.filter((m) => m.role === 'user');
    const systemMessages = input.filter((m) => m.role === 'system');
    
    return [
      ...systemMessages.map((m) => m.content),
      ...userMessages.map((m) => m.content),
    ].join('\n');
  }

  /**
   * Detect the primary task type
   */
  private detectTaskType(text: string): TaskType {
    const scores: Record<TaskType, number> = {
      classification: 0,
      generation: 0,
      reasoning: 0,
      coding: 0,
      conversation: 0,
      summarization: 0,
      extraction: 0,
    };

    // Score each task type based on pattern matches
    for (const [taskType, patterns] of Object.entries(TASK_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          scores[taskType as TaskType] += 1;
        }
      }
    }

    // Find highest scoring task type
    let maxScore = 0;
    let detectedType: TaskType = 'conversation'; // Default

    for (const [taskType, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedType = taskType as TaskType;
      }
    }

    return detectedType;
  }

  /**
   * Estimate task complexity
   */
  private estimateComplexity(text: string): 'low' | 'medium' | 'high' {
    // Check for high complexity indicators
    for (const pattern of COMPLEXITY_INDICATORS.high) {
      if (pattern.test(text)) {
        return 'high';
      }
    }

    // Check for low complexity indicators
    for (const pattern of COMPLEXITY_INDICATORS.low) {
      if (pattern.test(text)) {
        return 'low';
      }
    }

    // Use text length as a factor
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 500) return 'high';
    if (wordCount < 50) return 'low';

    // Check for code blocks (increases complexity)
    if (/```[\s\S]{100,}```/.test(text)) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Detect if task requires tool calling
   */
  private detectToolRequirement(text: string): boolean {
    const toolPatterns = [
      /\b(search|browse|fetch|api call|web request)\b/i,
      /\b(execute|run|perform action)\b/i,
      /\b(file|document|database|storage)\b/i,
      /\b(calculate|compute|math)\b/i,
    ];

    return toolPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Detect if task requires JSON output
   */
  private detectJsonRequirement(text: string): boolean {
    const jsonPatterns = [
      /\b(json|structured|schema|format as)\b/i,
      /\{[\s\S]*\}/, // JSON-like structure in prompt
      /\b(return|output|respond with).*\b(object|array|json)\b/i,
    ];

    return jsonPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Recommend model tier based on classification
   */
  private recommendTier(hint: TaskHint): ModelTier {
    const { taskType, estimatedComplexity } = hint;

    // High complexity always uses premium
    if (estimatedComplexity === 'high') {
      return 'premium';
    }

    // Low complexity uses cheap
    if (estimatedComplexity === 'low') {
      return 'cheap';
    }

    // Task-based defaults for medium complexity
    switch (taskType) {
      case 'classification':
      case 'extraction':
      case 'summarization':
        return 'cheap';

      case 'conversation':
      case 'generation':
        return 'standard';

      case 'reasoning':
      case 'coding':
        return 'standard';

      default:
        return 'standard';
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

export const taskClassifier = new TaskClassifier();

/**
 * Quick classification function
 */
export function classifyTask(input: string | ChatMessage[]): TaskHint & { tier: ModelTier } {
  return taskClassifier.classifyWithTier(input);
}


