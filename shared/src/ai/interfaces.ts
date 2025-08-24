// AI provider interfaces - provider-agnostic abstraction layer
// Phase 1-2: Interface definitions only, no implementations
// Phase 3+: Implement with actual providers

export interface EmbeddingProvider {
  /**
   * Generate embeddings for a batch of texts
   * @param texts Array of strings to embed
   * @returns Promise resolving to array of embedding vectors
   */
  embed(texts: string[]): Promise<number[][]>;
  
  /**
   * Get the dimension of embeddings produced by this provider
   */
  getDimension(): number;
  
  /**
   * Get the provider name for logging/debugging
   */
  getProviderName(): string;
}

export interface SummaryResult {
  summary: string;
  tags: string[];
  confidence: number; // 0-1 score
}

export interface SummaryProvider {
  /**
   * Generate a summary and tags from tab titles
   * @param titles Array of tab titles to summarize
   * @param context Optional context about the session
   * @returns Promise resolving to summary result
   */
  summarize(titles: string[], context?: {
    timeSpent?: number;
    domain?: string;
    previousSummary?: string;
  }): Promise<SummaryResult>;
  
  /**
   * Get the provider name for logging/debugging
   */
  getProviderName(): string;
}

// Configuration for AI providers
export interface AIConfig {
  embedding: {
    provider: 'cohere' | 'openai' | 'mock';
    api_key?: string;
    model?: string;
    batch_size?: number;
  };
  summary: {
    provider: 'gemini' | 'openai' | 'mock';
    api_key?: string;
    model?: string;
    max_tokens?: number;
  };
}

// Error types for AI operations
export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public operation: string,
    public cause?: Error
  ) {
    super(`${provider} ${operation}: ${message}`);
    this.name = 'AIProviderError';
  }
}

export class RateLimitError extends AIProviderError {
  constructor(provider: string, operation: string, retryAfter?: number) {
    super(`Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ''}`, provider, operation);
    this.name = 'RateLimitError';
  }
}

export class QuotaExceededError extends AIProviderError {
  constructor(provider: string, operation: string) {
    super('API quota exceeded', provider, operation);
    this.name = 'QuotaExceededError';
  }
}
