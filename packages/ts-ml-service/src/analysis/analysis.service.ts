import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface SummarizeResult {
  summary: string;
  keyPoints: string[];
  model: string;
  tokensUsed?: number;
}

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;
  confidence: number;
  aspects?: { aspect: string; sentiment: string; score: number }[];
  model: string;
}

export interface GenerateResult {
  content: string;
  model: string;
  tokensUsed?: number;
}

export interface ClassifyResult {
  classifications: Array<{
    category: string;
    confidence: number;
  }>;
  model: string;
  textPreview: string;
}

export interface AnalyzeTextResult {
  sentiment?: SentimentResult;
  summary?: SummarizeResult;
  keywords?: { keywords: string[]; model: string };
  wordCount: number;
  charCount: number;
  model: string;
}

@Injectable()
export class AnalysisService implements OnModuleInit {
  private openai: OpenAI | null = null;
  private defaultModel: string;

  constructor(private configService: ConfigService) {
    this.defaultModel = this.configService.get<string>(
      'defaultLlmModel',
      'gpt-4o-mini',
    );
  }

  onModuleInit() {
    const apiKey = this.configService.get<string>('openaiApiKey');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      console.warn(
        'OpenAI API key not configured - analysis will not be available',
      );
    }
  }

  /**
   * Summarize text content
   */
  async summarize(
    text: string,
    maxLength?: number,
    model?: string,
  ): Promise<SummarizeResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
    }

    const llmModel = model || this.defaultModel;
    const lengthInstruction = maxLength
      ? `Keep the summary under ${maxLength} words.`
      : 'Keep the summary concise but comprehensive.';

    const response = await this.openai.chat.completions.create({
      model: llmModel,
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that summarizes text. ${lengthInstruction}
Provide a summary and extract 3-5 key points as a JSON object with "summary" and "keyPoints" fields.`,
        },
        {
          role: 'user',
          content: `Summarize the following text:\n\n${text}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '{}';
    let parsed: { summary?: string; keyPoints?: string[] };

    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { summary: content, keyPoints: [] };
    }

    return {
      summary: parsed.summary || '',
      keyPoints: parsed.keyPoints || [],
      model: llmModel,
      tokensUsed: response.usage?.total_tokens,
    };
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(
    text: string,
    includeAspects: boolean = false,
    model?: string,
  ): Promise<SentimentResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
    }

    const llmModel = model || this.defaultModel;

    const aspectInstruction = includeAspects
      ? 'Also extract specific aspects and their individual sentiments.'
      : '';

    const response = await this.openai.chat.completions.create({
      model: llmModel,
      messages: [
        {
          role: 'system',
          content: `You are a sentiment analysis expert. Analyze the sentiment of the given text.
Return a JSON object with:
- "sentiment": one of "positive", "negative", "neutral", or "mixed"
- "score": a number from -1 (very negative) to 1 (very positive)
- "confidence": a number from 0 to 1 indicating confidence
${includeAspects ? '- "aspects": array of {aspect, sentiment, score} for specific topics mentioned' : ''}`,
        },
        {
          role: 'user',
          content: `Analyze the sentiment of this text:\n\n${text}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '{}';
    let parsed: {
      sentiment?: string;
      score?: number;
      confidence?: number;
      aspects?: { aspect: string; sentiment: string; score: number }[];
    };

    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { sentiment: 'neutral', score: 0, confidence: 0.5 };
    }

    return {
      sentiment: (parsed.sentiment as SentimentResult['sentiment']) || 'neutral',
      score: parsed.score ?? 0,
      confidence: parsed.confidence ?? 0.5,
      aspects: includeAspects ? parsed.aspects : undefined,
      model: llmModel,
    };
  }

  /**
   * Extract keywords/topics from text
   */
  async extractKeywords(
    text: string,
    maxKeywords: number = 10,
    model?: string,
  ): Promise<{ keywords: string[]; model: string }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
    }

    const llmModel = model || this.defaultModel;

    const response = await this.openai.chat.completions.create({
      model: llmModel,
      messages: [
        {
          role: 'system',
          content: `Extract the ${maxKeywords} most important keywords or topics from the text.
Return a JSON object with a "keywords" array of strings.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '{}';
    let parsed: { keywords?: string[] };

    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { keywords: [] };
    }

    return {
      keywords: parsed.keywords || [],
      model: llmModel,
    };
  }

  /**
   * Generate AI content based on prompt
   */
  async generateContent(
    prompt: string,
    context?: string,
    model?: string,
    maxTokens?: number,
    temperature?: number,
  ): Promise<GenerateResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
    }

    const llmModel = model || this.defaultModel;
    const systemMessage = context
      ? `You are a helpful AI assistant. Context: ${context}`
      : 'You are a helpful AI assistant.';

    const response = await this.openai.chat.completions.create({
      model: llmModel,
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens || 1000,
      temperature: temperature ?? 0.7,
    });

    const content = response.choices[0]?.message?.content || '';

    return {
      content,
      model: llmModel,
      tokensUsed: response.usage?.total_tokens,
    };
  }

  /**
   * Classify text into provided categories
   */
  async classify(
    text: string,
    categories: string[],
    multiLabel: boolean = false,
    model?: string,
  ): Promise<ClassifyResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
    }

    const llmModel = model || this.defaultModel;
    const categoryList = categories.join(', ');
    const instruction = multiLabel
      ? 'The text can belong to multiple categories. Return all applicable categories with confidence scores.'
      : 'The text belongs to exactly one category. Return the best matching category with confidence.';

    const response = await this.openai.chat.completions.create({
      model: llmModel,
      messages: [
        {
          role: 'system',
          content: `You are a text classification expert.
Available categories: ${categoryList}
${instruction}
Return a JSON object with "classifications" array containing objects with "category" and "confidence" (0-1) fields.`,
        },
        {
          role: 'user',
          content: `Classify this text:\n\n${text}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '{}';
    let parsed: {
      classifications?: Array<{ category: string; confidence: number }>;
    };

    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { classifications: [] };
    }

    return {
      classifications: parsed.classifications || [],
      model: llmModel,
      textPreview: text.length > 100 ? text.substring(0, 100) + '...' : text,
    };
  }

  /**
   * Analyze text with multiple analysis types
   */
  async analyzeText(
    text: string,
    analyses: string[] = ['sentiment', 'summary', 'keywords'],
    model?: string,
  ): Promise<AnalyzeTextResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
    }

    const result: AnalyzeTextResult = {
      wordCount: text.split(/\s+/).length,
      charCount: text.length,
      model: model || this.defaultModel,
    };

    // Perform requested analyses in parallel
    const promises: Promise<void>[] = [];

    if (analyses.includes('sentiment')) {
      promises.push(
        this.analyzeSentiment(text, false, model).then((sentimentResult) => {
          result.sentiment = sentimentResult;
        }),
      );
    }

    if (analyses.includes('summary')) {
      promises.push(
        this.summarize(text, undefined, model).then((summaryResult) => {
          result.summary = summaryResult;
        }),
      );
    }

    if (analyses.includes('keywords')) {
      promises.push(
        this.extractKeywords(text, 10, model).then((keywordsResult) => {
          result.keywords = keywordsResult;
        }),
      );
    }

    await Promise.all(promises);

    return result;
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }
}
