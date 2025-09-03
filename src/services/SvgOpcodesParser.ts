/**
 * SVG Parser for extracting line-specific opcodes from noir-profiler flamegraph
 */

export interface LineOpcodesData {
  lineNumber: number;
  column: number;
  expression: string;
  opcodes: number;
  percentage: number;
  fileName?: string; // Track which file the opcodes come from
  opcodeTypes?: string[];
}

export class SvgOpcodesParser {
  /**
   * Parse SVG content to extract line-specific opcode data
   * Works with any Noir source file, not just main.nr
   */
  parseLineOpcodes(svgContent: string): LineOpcodesData[] {
    console.log(`[SvgOpcodesParser] Step 4.1: parseLineOpcodes called with ${svgContent.length} chars`);
    
    const lineData: LineOpcodesData[] = [];
    
    // Pattern to match line-specific opcode data from SVG title elements
    // Flexible pattern that works with any .nr file (main.nr, lib.nr, etc.)
    // Examples: 
    // - <title>main.nr:3:12::x != 0 (2 opcodes, 4.35%)</title>
    // - <title>lib.nr:15:8::self.balance += val (5 opcodes, 10.87%)</title>
    // - <title>src/main.nr:8:12::sum as u64 > x as u64 (4 opcodes, 8.70%)</title>
    const titlePattern = /<title>([^:]+\.nr):(\d+):(\d+)::(.+?) \((\d+) opcodes, ([\d.]+)%\)<\/title>/g;
    
    console.log(`[SvgOpcodesParser] Step 4.2: Using regex pattern:`, titlePattern);
    
    let match;
    let matchCount = 0;
    while ((match = titlePattern.exec(svgContent)) !== null) {
      matchCount++;
      const fileName = match[1].trim();           // main.nr, lib.nr, src/main.nr, etc.
      const lineNumber = parseInt(match[2]);
      const column = parseInt(match[3]);
      const expression = match[4].trim();
      const opcodes = parseInt(match[5]);
      const percentage = parseFloat(match[6]);
      
      console.log(`[SvgOpcodesParser] Step 4.3: Match ${matchCount}: Line ${lineNumber}, "${expression}", ${opcodes} opcodes`);
      
      lineData.push({
        lineNumber,
        column,
        expression,
        opcodes,
        percentage,
        fileName // Add fileName to track which file the opcodes come from
      });
    }
    
    console.log(`[SvgOpcodesParser] Step 4.4: Total matches found: ${matchCount}`);
    console.log(`[SvgOpcodesParser] Step 4.5: Parsed data:`, lineData);
    
    // Sort by line number, then by column for easier lookup
    return lineData.sort((a, b) => {
      if (a.lineNumber !== b.lineNumber) {
        return a.lineNumber - b.lineNumber;
      }
      return a.column - b.column;
    });
  }

  /**
   * Get opcodes for a specific line number
   */
  getOpcodesForLine(svgContent: string, lineNumber: number, fileName?: string): LineOpcodesData[] {
    const allLineData = this.parseLineOpcodes(svgContent);
    return allLineData.filter(data => {
      const lineMatch = data.lineNumber === lineNumber;
      const fileMatch = fileName ? data.fileName === fileName : true;
      return lineMatch && fileMatch;
    });
  }

  /**
   * Get total opcodes for a line (sum of all expressions on that line)
   */
  getTotalOpcodesForLine(svgContent: string, lineNumber: number, fileName?: string): number {
    const lineData = this.getOpcodesForLine(svgContent, lineNumber, fileName);
    return lineData.reduce((total, data) => total + data.opcodes, 0);
  }

  /**
   * Get all unique expressions for a line
   */
  getExpressionsForLine(svgContent: string, lineNumber: number, fileName?: string): string[] {
    const lineData = this.getOpcodesForLine(svgContent, lineNumber, fileName);
    return lineData.map(data => data.expression);
  }

  /**
   * Get all unique file names found in the SVG
   */
  getFileNames(svgContent: string): string[] {
    const allLineData = this.parseLineOpcodes(svgContent);
    const fileNames = new Set<string>();
    allLineData.forEach(data => {
      if (data.fileName) {
        fileNames.add(data.fileName);
      }
    });
    return Array.from(fileNames);
  }

  /**
   * Get opcodes for a specific file
   */
  getOpcodesForFile(svgContent: string, fileName: string): LineOpcodesData[] {
    const allLineData = this.parseLineOpcodes(svgContent);
    return allLineData.filter(data => data.fileName === fileName);
  }

  /**
   * Debug: Print all parsed line data
   */
  debugPrintLineData(svgContent: string): void {
    const lineData = this.parseLineOpcodes(svgContent);
    console.log('=== SVG Line Opcodes Data ===');
    lineData.forEach(data => {
      const fileInfo = data.fileName ? `[${data.fileName}] ` : '';
      console.log(`${fileInfo}Line ${data.lineNumber}:${data.column} - "${data.expression}" (${data.opcodes} opcodes, ${data.percentage}%)`);
    });
    console.log('=============================');
  }

  /**
   * Debug: Print line totals by file
   */
  debugPrintLineTotals(svgContent: string): void {
    const lineData = this.parseLineOpcodes(svgContent);
    const fileTotals = new Map<string, Map<number, number>>();
    
    lineData.forEach(data => {
      const fileName = data.fileName || 'unknown';
      if (!fileTotals.has(fileName)) {
        fileTotals.set(fileName, new Map());
      }
      const lineTotals = fileTotals.get(fileName)!;
      const current = lineTotals.get(data.lineNumber) || 0;
      lineTotals.set(data.lineNumber, current + data.opcodes);
    });
    
    console.log('=== Line Totals by File ===');
    fileTotals.forEach((lineTotals, fileName) => {
      console.log(`File: ${fileName}`);
      lineTotals.forEach((total, lineNumber) => {
        console.log(`  Line ${lineNumber}: ${total} total opcodes`);
      });
    });
    console.log('===========================');
  }

  /**
   * Debug: Print all available line numbers in the SVG
   */
  debugPrintAvailableLines(svgContent: string): void {
    const lineData = this.parseLineOpcodes(svgContent);
    const lineNumbers = new Set<number>();
    
    lineData.forEach(data => {
      lineNumbers.add(data.lineNumber);
    });
    
    console.log('=== Available Line Numbers ===');
    const sortedLines = Array.from(lineNumbers).sort((a, b) => a - b);
    console.log('Lines with opcode data:', sortedLines.join(', '));
    console.log('==============================');
  }
}
