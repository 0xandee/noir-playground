import html2canvas from 'html2canvas';
import Prism from 'prismjs';
import 'prismjs/components/prism-rust'; // Closest to Noir syntax

export interface PreviewOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  theme?: 'light' | 'dark';
  title?: string;
  maxLines?: number;
}

export interface PreviewResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  blob: Blob;
}

export async function generateCodePreview(
  code: string,
  options: PreviewOptions = {}
): Promise<PreviewResult> {
  const {
    width = 1200,
    height = 630,
    fontSize = 14,
    theme = 'dark',
    title = 'Noir Code Snippet',
    maxLines = 20
  } = options;

  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.padding = '40px';
  container.style.boxSizing = 'border-box';
  container.style.fontFamily = '"Fira Code", "Monaco", "Menlo", "Ubuntu Mono", monospace';
  container.style.fontSize = `${fontSize}px`;
  container.style.lineHeight = '1.5';
  
  // Set theme colors
  if (theme === 'dark') {
    container.style.background = 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)';
    container.style.color = '#e2e8f0';
  } else {
    container.style.background = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)';
    container.style.color = '#1e293b';
  }

  // Add title
  const titleElement = document.createElement('div');
  titleElement.textContent = title;
  titleElement.style.fontSize = `${fontSize + 4}px`;
  titleElement.style.fontWeight = 'bold';
  titleElement.style.marginBottom = '20px';
  titleElement.style.color = theme === 'dark' ? '#60a5fa' : '#2563eb';
  container.appendChild(titleElement);

  // Process code (limit lines and highlight)
  const lines = code.split('\n').slice(0, maxLines);
  const truncatedCode = lines.join('\n');
  const highlightedCode = highlightNoirCode(truncatedCode, theme);

  // Add code container
  const codeContainer = document.createElement('div');
  codeContainer.style.background = theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.8)';
  codeContainer.style.border = `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`;
  codeContainer.style.borderRadius = '8px';
  codeContainer.style.padding = '20px';
  codeContainer.style.overflow = 'hidden';
  codeContainer.style.maxHeight = `${height - 120}px`;
  codeContainer.innerHTML = highlightedCode;
  container.appendChild(codeContainer);

  // Add watermark
  const watermark = document.createElement('div');
  watermark.textContent = 'noir-playground.app';
  watermark.style.position = 'absolute';
  watermark.style.bottom = '15px';
  watermark.style.right = '20px';
  watermark.style.fontSize = '12px';
  watermark.style.opacity = '0.6';
  watermark.style.color = theme === 'dark' ? '#9ca3af' : '#6b7280';
  container.appendChild(watermark);

  // Add to DOM temporarily
  document.body.appendChild(container);

  try {
    // Generate canvas
    const canvas = await html2canvas(container, {
      width,
      height,
      scale: 2, // Higher resolution
      backgroundColor: null,
      useCORS: true,
      allowTaint: true,
      logging: false
    });

    // Generate data URL and blob
    const dataUrl = canvas.toDataURL('image/png', 0.9);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png', 0.9);
    });

    return {
      canvas,
      dataUrl,
      blob
    };
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

function highlightNoirCode(code: string, theme: 'light' | 'dark'): string {
  // Use Rust highlighting as a base for Noir (similar syntax)
  let highlighted = Prism.highlight(code, Prism.languages.rust, 'rust');
  
  // Apply custom styling
  const styles = theme === 'dark' ? {
    keyword: '#ff7b7b',      // Red-ish for keywords
    string: '#98d982',       // Green for strings
    comment: '#8892b0',      // Gray for comments
    function: '#82aaff',     // Blue for functions
    number: '#f78c6c',       // Orange for numbers
    operator: '#89ddff',     // Cyan for operators
    punctuation: '#ffffff',  // White for punctuation
  } : {
    keyword: '#d73a49',      // Red for keywords
    string: '#22863a',       // Green for strings
    comment: '#6a737d',      // Gray for comments
    function: '#005cc5',     // Blue for functions
    number: '#e36209',       // Orange for numbers
    operator: '#d73a49',     // Red for operators
    punctuation: '#24292e',  // Dark for punctuation
  };

  // Apply color styling
  highlighted = highlighted
    .replace(/class="token keyword"/g, `class="token keyword" style="color: ${styles.keyword}"`)
    .replace(/class="token string"/g, `class="token string" style="color: ${styles.string}"`)
    .replace(/class="token comment"/g, `class="token comment" style="color: ${styles.comment}"`)
    .replace(/class="token function"/g, `class="token function" style="color: ${styles.function}"`)
    .replace(/class="token number"/g, `class="token number" style="color: ${styles.number}"`)
    .replace(/class="token operator"/g, `class="token operator" style="color: ${styles.operator}"`)
    .replace(/class="token punctuation"/g, `class="token punctuation" style="color: ${styles.punctuation}"`);

  return `<pre style="margin: 0; font-family: inherit; font-size: inherit; line-height: inherit;"><code>${highlighted}</code></pre>`;
}

// Utility to save preview image (for development/testing)
export function downloadPreviewImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Cache for generated previews
const previewCache = new Map<string, string>();

export function getCachedPreview(cacheKey: string): string | null {
  return previewCache.get(cacheKey) || null;
}

export function setCachedPreview(cacheKey: string, dataUrl: string): void {
  // Limit cache size
  if (previewCache.size > 50) {
    const firstKey = previewCache.keys().next().value;
    previewCache.delete(firstKey);
  }
  previewCache.set(cacheKey, dataUrl);
}

export function generateCacheKey(code: string, options: PreviewOptions): string {
  const optionsStr = JSON.stringify(options);
  return btoa(code.substring(0, 100) + optionsStr).replace(/[^a-zA-Z0-9]/g, '');
}