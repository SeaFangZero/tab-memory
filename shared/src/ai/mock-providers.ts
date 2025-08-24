// Mock implementations for AI providers - used in Phase 1-2 and testing

import { EmbeddingProvider, SummaryProvider, SummaryResult } from './interfaces.js';

/**
 * Mock embedding provider that generates deterministic fake embeddings
 * Useful for testing and early development phases
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  private dimension = 384; // Common embedding dimension

  async embed(texts: string[]): Promise<number[][]> {
    // Generate deterministic embeddings based on text content
    return texts.map(text => this.generateMockEmbedding(text));
  }

  getDimension(): number {
    return this.dimension;
  }

  getProviderName(): string {
    return 'mock-embedding';
  }

  private generateMockEmbedding(text: string): number[] {
    // Create a simple hash-based deterministic embedding
    const embedding = new Array(this.dimension).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = (charCode * (i + 1)) % this.dimension;
      embedding[index] += Math.sin(charCode * 0.1) * 0.1;
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }
}

/**
 * Mock summary provider that generates simple rule-based summaries
 * Useful for testing and early development phases
 */
export class MockSummaryProvider implements SummaryProvider {
  async summarize(titles: string[], context?: {
    timeSpent?: number;
    domain?: string;
    previousSummary?: string;
  }): Promise<SummaryResult> {
    if (titles.length === 0) {
      return {
        summary: 'Empty session',
        tags: [],
        confidence: 0
      };
    }

    // Extract common themes and domains
    const domains = this.extractDomains(titles);
    const commonWords = this.extractCommonWords(titles);
    const tags = [...domains, ...commonWords.slice(0, 3)];

    // Generate a simple summary
    let summary = '';
    if (domains.length > 0) {
      summary = `Browsing session focused on ${domains[0]}`;
      if (domains.length > 1) {
        summary += ` and ${domains.length - 1} other domain${domains.length > 2 ? 's' : ''}`;
      }
    } else if (commonWords.length > 0) {
      summary = `Session related to ${commonWords[0]}`;
    } else {
      summary = `General browsing session with ${titles.length} tab${titles.length > 1 ? 's' : ''}`;
    }

    // Add time context if available
    if (context?.timeSpent && context.timeSpent > 1800) { // 30+ minutes
      summary += ' (extended session)';
    }

    const confidence = Math.min(0.9, 0.3 + (commonWords.length * 0.1) + (domains.length * 0.2));

    return {
      summary,
      tags: tags.slice(0, 5), // Limit to 5 tags
      confidence
    };
  }

  getProviderName(): string {
    return 'mock-summary';
  }

  private extractDomains(titles: string[]): string[] {
    const domains = new Set<string>();
    
    titles.forEach(title => {
      const lowerTitle = title.toLowerCase();
      
      // Common domain patterns
      if (lowerTitle.includes('github')) domains.add('development');
      if (lowerTitle.includes('stackoverflow') || lowerTitle.includes('stack overflow')) domains.add('programming');
      if (lowerTitle.includes('youtube')) domains.add('videos');
      if (lowerTitle.includes('gmail') || lowerTitle.includes('email')) domains.add('email');
      if (lowerTitle.includes('docs') || lowerTitle.includes('documentation')) domains.add('documentation');
      if (lowerTitle.includes('news') || lowerTitle.includes('article')) domains.add('news');
      if (lowerTitle.includes('shop') || lowerTitle.includes('buy') || lowerTitle.includes('cart')) domains.add('shopping');
      if (lowerTitle.includes('twitter') || lowerTitle.includes('facebook') || lowerTitle.includes('instagram')) domains.add('social');
    });

    return Array.from(domains);
  }

  private extractCommonWords(titles: string[]): string[] {
    const wordCounts = new Map<string, number>();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'under', 'over', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'this', 'that', 'these', 'those']);

    titles.forEach(title => {
      const words = title.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));

      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .map(([word]) => word);
  }
}
