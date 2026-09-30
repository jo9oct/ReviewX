import {
  AiAnalyzer,
} from './aiAnalyzer.js';

class AiManager {
  constructor({
    analyzer = null,
  } = {}) {
    this.analyzer =
      analyzer ||
      new AiAnalyzer();
  }

  isAvailable() {
    return this.analyzer.isAvailable();
  }

  async analyzeReview({
    findings,
    files,
    score,
    options = {},
  }) {
    return this.analyzer.analyze({
      findings,
      files,
      score,
      options,
    });
  }

  async analyzeFinding({
    finding,
    source,
    options = {},
  }) {
    return this.analyzer.analyzeFinding({
      finding,
      source,
      options,
    });
  }
}

const aiManager =
  new AiManager();

export {
  AiManager,
  aiManager,
};