/**
 * HeatmapDecorationService - Manages Monaco editor decorations for circuit complexity heatmaps
 */

import * as monaco from 'monaco-editor';
import { 
  HeatmapData, 
  MetricType, 
  MetricsConfiguration, 
  DEFAULT_METRICS_CONFIG,
  CircuitComplexityReport,
  LineMetrics,
  MetricsDelta 
} from '@/types/circuitMetrics';

export interface DecorationOptions {
  showGutterHeat: boolean;
  showInlineMetrics: boolean;
  showDeltaIndicators: boolean;
  metricType: MetricType;
  threshold: number; // Show only lines with heat >= threshold (0-1)
}

export interface HeatmapDecorations {
  gutterDecorations: string[];
  inlineDecorations: string[];
  lineHighlights: string[];
}

export class HeatmapDecorationService {
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private config: MetricsConfiguration;
  private currentDecorations: HeatmapDecorations = {
    gutterDecorations: [],
    inlineDecorations: [],
    lineHighlights: []
  };
  private styleElement: HTMLStyleElement | null = null;

  constructor(config?: Partial<MetricsConfiguration>) {
    this.config = { ...DEFAULT_METRICS_CONFIG, ...config };
    this.initializeStyles();
  }

  /**
   * Initialize the service with a Monaco editor instance
   */
  public initialize(editor: monaco.editor.IStandaloneCodeEditor): void {
    this.editor = editor;
  }

  /**
   * Apply heatmap decorations to the editor based on complexity report
   */
  public applyHeatmapDecorations(
    report: CircuitComplexityReport,
    options: DecorationOptions,
    deltas?: Map<number, MetricsDelta>
  ): void {
    if (!this.editor || !report.files.length) return;

    const fileMetrics = report.files[0]; // Assuming single file for now
    const heatmapData = this.generateHeatmapData(fileMetrics, options);

    // Clear existing decorations
    this.clearDecorations();

    // Apply new decorations
    if (options.showGutterHeat) {
      this.applyGutterHeatDecorations(heatmapData);
    }

    if (options.showInlineMetrics) {
      this.applyInlineMetricDecorations(heatmapData, options.metricType);
    }

    if (options.showDeltaIndicators && deltas) {
      this.applyDeltaDecorations(deltas);
    }

    // Apply line highlights for top hotspots
    this.applyHotspotHighlights(heatmapData.slice(0, 5)); // Top 5 hotspots
  }

  /**
   * Generate heatmap data from file metrics
   */
  private generateHeatmapData(
    fileMetrics: { lines: LineMetrics[] },
    options: DecorationOptions
  ): HeatmapData[] {
    return fileMetrics.lines
      .filter((line: LineMetrics) => line.normalizedHeat >= options.threshold)
      .map((line: LineMetrics) => this.createHeatmapData(line, options.metricType))
      .sort((a: HeatmapData, b: HeatmapData) => b.heatValue - a.heatValue);
  }

  /**
   * Create heatmap data for a single line
   */
  private createHeatmapData(line: LineMetrics, metricType: MetricType): HeatmapData {
    const primaryMetric = this.getMetricValue(line, metricType);
    const badgeText = this.formatBadgeText(primaryMetric, metricType);
    const tooltipContent = this.formatTooltipContent(line);

    return {
      lineNumber: line.lineNumber,
      heatValue: line.normalizedHeat,
      primaryMetric,
      metricType,
      badgeText,
      tooltipContent
    };
  }

  /**
   * Apply gutter heat decorations (colored bars indicating heat level)
   */
  private applyGutterHeatDecorations(heatmapData: HeatmapData[]): void {
    if (!this.editor) return;

    const decorations: monaco.editor.IModelDeltaDecoration[] = heatmapData.map(data => {
      const heatColor = this.getHeatColor(data.heatValue);
      const intensity = Math.round(data.heatValue * 100);

      return {
        range: new monaco.Range(data.lineNumber, 1, data.lineNumber, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: `heatmap-gutter-${this.getHeatLevel(data.heatValue)}`
        }
      };
    });

    const model = this.editor.getModel();
    if (model) {
      this.currentDecorations.gutterDecorations = model.deltaDecorations(
        this.currentDecorations.gutterDecorations,
        decorations
      );
    }
  }

  /**
   * Apply inline metric decorations (badges showing metric values)
   */
  private applyInlineMetricDecorations(heatmapData: HeatmapData[], metricType: MetricType): void {
    if (!this.editor) return;

    const decorations: monaco.editor.IModelDeltaDecoration[] = heatmapData.map(data => {
      const model = this.editor!.getModel();
      if (!model) return null;

      const lineLength = model.getLineLength(data.lineNumber);
      const heatLevel = this.getHeatLevel(data.heatValue);

      return {
        range: new monaco.Range(data.lineNumber, lineLength + 1, data.lineNumber, lineLength + 1),
        options: {
          after: {
            content: ` // ${data.badgeText} (${Math.round(data.heatValue * 100)}%)`,
            inlineClassName: `heatmap-inline-${heatLevel}`,
            inlineClassNameAffectsLetterSpacing: false
          }
        }
      };
    }).filter(Boolean) as monaco.editor.IModelDeltaDecoration[];

    const model = this.editor.getModel();
    if (model) {
      this.currentDecorations.inlineDecorations = model.deltaDecorations(
        this.currentDecorations.inlineDecorations,
        decorations
      );
    }
  }

  /**
   * Apply delta decorations (improvement/regression indicators)
   */
  private applyDeltaDecorations(deltas: Map<number, MetricsDelta>): void {
    if (!this.editor) return;

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    deltas.forEach((delta, lineNumber) => {
      if (Math.abs(delta.delta) < 1) return; // Skip very small changes

      const isImprovement = delta.isImprovement;
      const className = isImprovement ? 'heatmap-delta-improvement' : 'heatmap-delta-regression';
      const symbol = isImprovement ? '↓' : '↑';
      const color = isImprovement ? '#22c55e' : '#ef4444';

      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          marginClassName: className,
          after: {
            content: ` ${symbol}${Math.abs(delta.delta)}`,
            inlineClassName: className
          }
        }
      });
    });

    const model = this.editor.getModel();
    if (model) {
      // We'll add these to inline decorations for now
      const existingDecorations = this.currentDecorations.inlineDecorations;
      this.currentDecorations.inlineDecorations = model.deltaDecorations(
        [],
        [...(model.getAllDecorations().filter(d => existingDecorations.includes(d.id))), ...decorations]
      );
    }
  }

  /**
   * Apply subtle background highlights for top hotspots
   */
  private applyHotspotHighlights(topHotspots: HeatmapData[]): void {
    if (!this.editor) return;

    const decorations: monaco.editor.IModelDeltaDecoration[] = topHotspots.map((data, index) => {
      const opacity = 0.1 - (index * 0.015); // Fade out for lower-ranked hotspots
      
      return {
        range: new monaco.Range(data.lineNumber, 1, data.lineNumber, Number.MAX_SAFE_INTEGER),
        options: {
          isWholeLine: true,
          className: `heatmap-hotspot-highlight-${this.getHeatLevel(data.heatValue)}`
        }
      };
    });

    const model = this.editor.getModel();
    if (model) {
      this.currentDecorations.lineHighlights = model.deltaDecorations(
        this.currentDecorations.lineHighlights,
        decorations
      );
    }
  }

  /**
   * Clear all decorations
   */
  public clearDecorations(): void {
    if (!this.editor) return;

    const model = this.editor.getModel();
    if (model) {
      model.deltaDecorations([
        ...this.currentDecorations.gutterDecorations,
        ...this.currentDecorations.inlineDecorations,
        ...this.currentDecorations.lineHighlights
      ], []);

      this.currentDecorations = {
        gutterDecorations: [],
        inlineDecorations: [],
        lineHighlights: []
      };
    }
  }

  /**
   * Update configuration
   */
  public updateConfiguration(config: Partial<MetricsConfiguration>): void {
    this.config = { ...this.config, ...config };
    this.updateStyles();
  }

  /**
   * Destroy the service and clean up
   */
  public destroy(): void {
    this.clearDecorations();
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
    this.editor = null;
  }

  /**
   * Helper methods
   */
  private getMetricValue(line: LineMetrics, metricType: MetricType): number {
    switch (metricType) {
      case 'acir': return line.acirOpcodes;
      case 'brillig': return line.brilligOpcodes;
      case 'gates': return line.gates;
      default: return line.totalCost;
    }
  }

  private formatBadgeText(value: number, metricType: MetricType): string {
    const suffix = metricType === 'gates' ? 'g' : 'ops';
    if (this.config.badgeFormat === 'compact') {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k${suffix}`;
      }
      return `${value}${suffix}`;
    }
    return `${value} ${metricType}`;
  }

  private formatTooltipContent(line: LineMetrics): string {
    // Determine hotspot rank if available (assuming hotspots are sorted by impact)
    let hotspotInfo = '';
    if (line.percentage >= 5) { // Significant lines
      hotspotInfo = `\n  • **Hotspot:** Top contributor to circuit complexity`;
    }

    // Build optimization hints based on line metrics
    let hints = '';
    if (line.acirOpcodes > 20) {
      hints = `\n\n💡 **Optimization Hint**\n  High ACIR opcode count detected. Consider optimizing this line.`;
    }

    return `**Line ${line.lineNumber} Complexity**\n` +
           `═══════════════════════════════════\n\n` +
           `📊 **Circuit Cost Summary**\n` +
           `  • **Total:** ${line.acirOpcodes} opcodes (${line.percentage.toFixed(2)}% of circuit)${hotspotInfo}\n\n` +
           `📈 **Resource Usage**\n` +
           `  • **ACIR Opcodes:** ${line.acirOpcodes}\n` +
           `  • **Brillig Opcodes:** ${line.brilligOpcodes}\n` +
           `  • **Proving Gates:** ${line.gates}${hints}`;
  }

  private getHeatColor(heatValue: number): string {
    const { low, medium, high } = this.config.gradientColors;
    
    if (heatValue <= 0.33) {
      // Green to Yellow
      const ratio = heatValue / 0.33;
      return this.interpolateColor(low, medium, ratio);
    } else {
      // Yellow to Red
      const ratio = (heatValue - 0.33) / 0.67;
      return this.interpolateColor(medium, high, ratio);
    }
  }

  private getHeatLevel(heatValue: number): 'low' | 'medium' | 'high' {
    if (heatValue <= 0.33) return 'low';
    if (heatValue <= 0.66) return 'medium';
    return 'high';
  }

  private interpolateColor(color1: string, color2: string, ratio: number): string {
    // Simple color interpolation - could be enhanced with a proper color library
    return ratio < 0.5 ? color1 : color2;
  }

  /**
   * Initialize CSS styles for heatmap decorations
   */
  private initializeStyles(): void {
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'heatmap-decoration-styles';
    document.head.appendChild(this.styleElement);
    this.updateStyles();
  }

  private updateStyles(): void {
    if (!this.styleElement) return;

    const { gradientColors } = this.config;

    this.styleElement.textContent = `
      /* Gutter heat indicators */
      .heatmap-gutter-low::before {
        content: "▌";
        color: ${gradientColors.low};
        font-weight: bold;
        font-size: 14px;
      }
      .heatmap-gutter-medium::before {
        content: "▌";
        color: ${gradientColors.medium};
        font-weight: bold;
        font-size: 14px;
      }
      .heatmap-gutter-high::before {
        content: "▌";
        color: ${gradientColors.high};
        font-weight: bold;
        font-size: 14px;
      }

      /* Inline metric badges */
      .heatmap-inline-low {
        color: ${gradientColors.low} !important;
        font-style: italic !important;
        font-size: 0.85em !important;
        opacity: 0.8;
      }
      .heatmap-inline-medium {
        color: ${gradientColors.medium} !important;
        font-style: italic !important;
        font-size: 0.85em !important;
        opacity: 0.9;
      }
      .heatmap-inline-high {
        color: ${gradientColors.high} !important;
        font-style: italic !important;
        font-size: 0.85em !important;
        font-weight: bold !important;
        opacity: 1;
      }

      /* Hotspot highlights */
      .heatmap-hotspot-highlight-low {
        background-color: ${gradientColors.low}10 !important;
      }
      .heatmap-hotspot-highlight-medium {
        background-color: ${gradientColors.medium}15 !important;
      }
      .heatmap-hotspot-highlight-high {
        background-color: ${gradientColors.high}20 !important;
      }

      /* Delta indicators */
      .heatmap-delta-improvement {
        color: #22c55e !important;
        font-weight: bold !important;
      }
      .heatmap-delta-regression {
        color: #ef4444 !important;
        font-weight: bold !important;
      }
    `;
  }
}