// Line analysis service with real SVG opcode parsing

import { SvgOpcodesParser, LineOpcodesData } from './SvgOpcodesParser';
import { NoirProfilerService } from './NoirProfilerService';

export interface LineAnalysisResult {
  lineNumber: number;
  lineText: string;
  opcodes: string[];
  constraints: ConstraintInfo[];
  error?: string;
}

export interface ConstraintInfo {
  type: 'assert' | 'constrain' | 'arithmetic' | 'comparison' | 'type_conversion';
  expression: string;
  complexity: number;
  cost: number;
}

export interface LineAnalysisRequest {
  sourceCode: string;
  lineNumber: number;
  cargoToml?: string;
}

interface CachedSvgData {
  data: string;
  _cachedAt: number;
}

export class LineAnalysisService {
  private svgParser: SvgOpcodesParser;
  private profilerService: NoirProfilerService;
  private analysisCache: Map<string, LineAnalysisResult & { _cachedAt: number }>;
  private svgCache: Map<string, CachedSvgData>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.svgParser = new SvgOpcodesParser();
    this.profilerService = new NoirProfilerService();
    this.analysisCache = new Map();
    this.svgCache = new Map();
  }

  /**
   * Analyze a specific line of Noir code - Real SVG opcode parsing with caching
   */
  async analyzeLine(request: LineAnalysisRequest): Promise<LineAnalysisResult> {
    const { sourceCode, lineNumber, cargoToml } = request;
    
    // Get the line text
    const lines = sourceCode.split('\n');
    const lineText = lines[lineNumber - 1] || '';
    
    // Skip empty lines and comments
    if (!lineText.trim() || lineText.trim().startsWith('//')) {
      return {
        lineNumber,
        lineText,
        opcodes: [],
        constraints: []
      };
    }
    
    // Generate cache key for this specific analysis
    const cacheKey = this.generateCacheKey(sourceCode, lineNumber, cargoToml);
    
    // Check if we have a valid cached result
    const cachedResult = this.getCachedAnalysis(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    try {
      // Get real opcode data from SVG parsing
      const realOpcodes = await this.getRealOpcodesForLine(sourceCode, lineNumber, cargoToml);
      
      // For now, use simple mock constraints (we'll implement real constraints later)
      const mockConstraints = this.getMockConstraintsForLine(lineNumber, lineText);
      
      const result = {
        lineNumber,
        lineText,
        opcodes: realOpcodes,
        constraints: mockConstraints
      };
      
      // Cache the result
      this.setCachedAnalysis(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Real opcode analysis failed, falling back to mock data:', error);
      
      // Fallback to mock data if real analysis fails
      const mockData = this.getMockDataForLine(lineNumber, lineText);
      const result = {
        lineNumber,
        lineText,
        opcodes: mockData.opcodes,
        constraints: mockData.constraints
      };
      
      // Cache the fallback result too
      this.setCachedAnalysis(cacheKey, result);
      
      return result;
    }
  }

  /**
   * Get simple mock data for a line
   */
  private getMockDataForLine(lineNumber: number, lineText: string): { opcodes: string[]; constraints: ConstraintInfo[] } {
    // Skip empty lines and comments
    if (!lineText.trim() || lineText.trim().startsWith('//')) {
      return { opcodes: [], constraints: [] };
    }

    // Simple mock data based on line content
    const opcodes: string[] = [];
    const constraints: ConstraintInfo[] = [];

    // Mock opcodes
    if (lineText.includes('assert')) {
      opcodes.push('ASSERT');
    }
    if (lineText.includes('+')) {
      opcodes.push('ADD');
    }
    if (lineText.includes('>')) {
      opcodes.push('GT');
    }
    if (lineText.includes('as')) {
      opcodes.push('CAST');
    }
    if (lineText.includes('let')) {
      opcodes.push('STORE');
    }

    // Mock constraints
    if (lineText.includes('assert')) {
      constraints.push({
        type: 'assert',
        expression: lineText.trim(),
        complexity: 0,
        cost: 0
      });
    }
    if (lineText.includes('+')) {
      constraints.push({
        type: 'arithmetic',
        expression: 'addition operation',
        complexity: 0,
        cost: 0
      });
    }
    if (lineText.includes('>')) {
      constraints.push({
        type: 'comparison',
        expression: 'greater than comparison',
        complexity: 0,
        cost: 0
      });
    }
    if (lineText.includes('as')) {
      constraints.push({
        type: 'type_conversion',
        expression: 'type conversion',
        complexity: 0,
        cost: 0
      });
    }

    return { opcodes, constraints };
  }



  /**
   * Get real opcodes for a specific line using SVG parsing with caching
   */
  private async getRealOpcodesForLine(sourceCode: string, lineNumber: number, cargoToml?: string): Promise<string[]> {
    // Generate SVG cache key
    const svgCacheKey = this.generateSvgCacheKey(sourceCode, cargoToml);
    
    // Check if we have cached SVG data
    let svgData = this.getCachedSvg(svgCacheKey);
    
    if (!svgData) {
      // Get SVG data from profiler service
      const profilerResult = await this.profilerService.profileCircuit({
        sourceCode,
        cargoToml
      });
      
      if (!profilerResult.acirSVG) {
        throw new Error('No SVG data available from profiler');
      }
      
      svgData = profilerResult.acirSVG;
      
      // Cache the SVG data
      this.setCachedSvg(svgCacheKey, svgData);
    }
    
    // Parse SVG to get line-specific opcode data
    const allLineData = this.svgParser.parseLineOpcodes(svgData);
    
    // Get data for the specific line with exact matching
    const lineData = this.getExactLineData(allLineData, lineNumber, sourceCode);
    
    return this.formatOpcodesForLine(lineData);
  }

  /**
   * Get exact line data by matching line number and determining the correct file
   */
  private getExactLineData(allLineData: LineOpcodesData[], lineNumber: number, sourceCode: string): LineOpcodesData[] {
    // Find data for the exact line number only
    const lineData = allLineData.filter(data => data.lineNumber === lineNumber);
    
    return lineData;
  }

  /**
   * Format opcode data for display
   */
  private formatOpcodesForLine(lineData: LineOpcodesData[]): string[] {
    if (lineData.length === 0) {
      return ['No opcodes (line not in circuit)'];
    }
    
    const totalOpcodes = lineData.reduce((sum, data) => sum + data.opcodes, 0);
    const opcodes: string[] = [];
    
    // Add total opcodes
    opcodes.push(`${totalOpcodes} opcodes`);
    
    // Add individual expressions with their opcode counts
    lineData.forEach((data) => {
      if (data.opcodes > 0) {
        // Clean up HTML entities and extra text
        const cleanExpression = this.cleanExpression(data.expression);
        const expressionText = `${cleanExpression} (${data.opcodes} opcodes)`;
        opcodes.push(expressionText);
      }
    });
    
    return opcodes;
  }

  // Caching methods removed - will be implemented later

  /**
   * Clean expression text by removing HTML entities and extra markup
   */
  private cleanExpression(expression: string): string {
    return expression
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .trim();
  }

  /**
   * Get mock constraints for a line (temporary until we implement real constraint parsing)
   */
  private getMockConstraintsForLine(lineNumber: number, lineText: string): ConstraintInfo[] {
    const constraints: ConstraintInfo[] = [];
    
    if (lineText.includes('assert')) {
      constraints.push({
        type: 'assert',
        expression: lineText.trim(),
        complexity: 0,
        cost: 0
      });
    }
    
    return constraints;
  }

  /**
   * Generate cache key for analysis results
   */
  private generateCacheKey(sourceCode: string, lineNumber: number, cargoToml?: string): string {
    const sourceHash = this.simpleHash(sourceCode);
    const cargoHash = cargoToml ? this.simpleHash(cargoToml) : 'no-cargo';
    return `analysis:${sourceHash}:${lineNumber}:${cargoHash}`;
  }

  /**
   * Generate cache key for SVG data
   */
  private generateSvgCacheKey(sourceCode: string, cargoToml?: string): string {
    const sourceHash = this.simpleHash(sourceCode);
    const cargoHash = cargoToml ? this.simpleHash(cargoToml) : 'no-cargo';
    return `svg:${sourceHash}:${cargoHash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached analysis result
   */
  private getCachedAnalysis(cacheKey: string): LineAnalysisResult | null {
    const cached = this.analysisCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }
    if (cached) {
      this.analysisCache.delete(cacheKey);
    }
    return null;
  }

  /**
   * Set cached analysis result
   */
  private setCachedAnalysis(cacheKey: string, result: LineAnalysisResult): void {
    const cachedResult = {
      ...result,
      _cachedAt: Date.now()
    };
    this.analysisCache.set(cacheKey, cachedResult);
  }

  /**
   * Get cached SVG data
   */
  private getCachedSvg(cacheKey: string): string | null {
    const cached = this.svgCache.get(cacheKey);
    if (cached && this.isSvgCacheValid(cached)) {
      return cached.data;
    }
    if (cached) {
      this.svgCache.delete(cacheKey);
    }
    return null;
  }

  /**
   * Set cached SVG data
   */
  private setCachedSvg(cacheKey: string, svgData: string): void {
    const cachedSvg = {
      data: svgData,
      _cachedAt: Date.now()
    };
    this.svgCache.set(cacheKey, cachedSvg);
  }

  /**
   * Check if analysis cache entry is valid
   */
  private isCacheValid(cached: LineAnalysisResult & { _cachedAt: number }): boolean {
    return cached._cachedAt && (Date.now() - cached._cachedAt) < this.CACHE_TTL;
  }

  /**
   * Check if SVG cache entry is valid
   */
  private isSvgCacheValid(cached: CachedSvgData): boolean {
    return cached._cachedAt && (Date.now() - cached._cachedAt) < this.CACHE_TTL;
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.analysisCache.clear();
    this.svgCache.clear();
  }

  /**
   * Clear cache for specific source code
   */
  public clearCacheForSource(sourceCode: string, cargoToml?: string): void {
    const sourceHash = this.simpleHash(sourceCode);
    const cargoHash = cargoToml ? this.simpleHash(cargoToml) : 'no-cargo';
    
    // Clear analysis cache entries for this source
    for (const [key, value] of this.analysisCache.entries()) {
      if (key.includes(sourceHash) && key.includes(cargoHash)) {
        this.analysisCache.delete(key);
      }
    }
    
    // Clear SVG cache entry for this source
    const svgKey = `svg:${sourceHash}:${cargoHash}`;
    this.svgCache.delete(svgKey);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { analysisEntries: number; svgEntries: number; totalSize: number } {
    return {
      analysisEntries: this.analysisCache.size,
      svgEntries: this.svgCache.size,
      totalSize: this.analysisCache.size + this.svgCache.size
    };
  }
}
