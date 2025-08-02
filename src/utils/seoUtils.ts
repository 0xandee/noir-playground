import type { SharedSnippet } from '../types/snippet';

export interface SnippetMetaData {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  ogImage: string;
  ogImageAlt: string;
  jsonLd: object;
}

export function generateSnippetMetaData(snippet: SharedSnippet): SnippetMetaData {
  // Extract language from code (simple heuristic)
  const language = detectLanguage(snippet.code);
  
  // Generate smart description from code
  const codePreview = generateCodePreview(snippet.code);
  
  // Create SEO-friendly title
  const title = snippet.title 
    ? `${snippet.title} - Noir Code Snippet | Noir Playground`
    : `${language} Noir Snippet | Noir Playground`;
  
  // Generate description with code preview
  const description = `Explore this ${language} zero-knowledge proof snippet: "${codePreview}". Interactive Noir code with Monaco editor, compilation, and proof generation.`;
  
  // Generate keywords based on code content
  const keywords = generateKeywords(snippet.code, language);
  
  // Canonical URL
  const canonicalUrl = `https://noir-playground.app/share/${snippet.id}`;
  
  // Generate preview image URL - fallback to default for now
  // In a production environment, you'd generate and cache these images
  const ogImage = `https://noir-playground.app/noir-playground-og.png`;
  const ogImageAlt = `${language} Noir code snippet preview: ${snippet.title || 'Untitled'}`;
  
  // JSON-LD structured data for code snippet
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    "name": snippet.title || `${language} Noir Snippet`,
    "description": description,
    "url": canonicalUrl,
    "programmingLanguage": "Noir",
    "codeRepository": "https://github.com/noir-lang/noir",
    "creator": {
      "@type": "Organization",
      "name": "Noir Playground"
    },
    "dateCreated": snippet.createdAt,
    "dateModified": snippet.updatedAt || snippet.createdAt,
    "isPartOf": {
      "@type": "SoftwareApplication",
      "name": "Noir Playground",
      "url": "https://noir-playground.app"
    }
  };
  
  return {
    title,
    description,
    keywords,
    canonicalUrl,
    ogImage,
    ogImageAlt,
    jsonLd
  };
}

function detectLanguage(code: string): string {
  // Simple language detection based on Noir syntax patterns
  if (code.includes('fn main(') || code.includes('use dep::')) {
    return 'Noir';
  }
  if (code.includes('circuit') || code.includes('witness')) {
    return 'ZK Circuit';
  }
  if (code.includes('proof') || code.includes('verify')) {
    return 'ZK Proof';
  }
  return 'Noir';
}

function generateCodePreview(code: string): string {
  // Extract meaningful preview from code
  const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
  
  if (lines.length === 0) return 'Empty code snippet';
  
  // Try to find function definitions
  const fnLine = lines.find(line => line.includes('fn ') && line.includes('('));
  if (fnLine) {
    const match = fnLine.match(/fn\s+(\w+)/);
    if (match) {
      return `Function: ${match[1]}`;
    }
  }
  
  // Try to find struct definitions
  const structLine = lines.find(line => line.includes('struct '));
  if (structLine) {
    const match = structLine.match(/struct\s+(\w+)/);
    if (match) {
      return `Struct: ${match[1]}`;
    }
  }
  
  // Try to find circuit patterns
  if (code.includes('circuit')) {
    return 'ZK Circuit implementation';
  }
  
  if (code.includes('proof') || code.includes('verify')) {
    return 'Zero-knowledge proof';
  }
  
  // Fallback to first meaningful line
  const firstLine = lines[0].trim();
  return firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
}

function generateKeywords(code: string, language: string): string[] {
  const baseKeywords = ['noir', 'zero-knowledge', 'zk-proofs', 'cryptography', 'playground', 'code-snippet'];
  
  const dynamicKeywords: string[] = [];
  
  // Add language-specific keywords
  dynamicKeywords.push(language.toLowerCase());
  
  // Extract keywords from code patterns
  if (code.includes('fn ')) dynamicKeywords.push('function', 'noir-function');
  if (code.includes('struct ')) dynamicKeywords.push('struct', 'data-structure');
  if (code.includes('circuit')) dynamicKeywords.push('circuit', 'zk-circuit');
  if (code.includes('proof')) dynamicKeywords.push('proof-generation', 'cryptographic-proof');
  if (code.includes('verify')) dynamicKeywords.push('proof-verification', 'verification');
  if (code.includes('witness')) dynamicKeywords.push('witness', 'private-inputs');
  if (code.includes('public')) dynamicKeywords.push('public-inputs', 'transparency');
  if (code.includes('private')) dynamicKeywords.push('privacy', 'private-computation');
  if (code.includes('constraint')) dynamicKeywords.push('constraints', 'arithmetic-circuit');
  if (code.includes('hash')) dynamicKeywords.push('cryptographic-hash', 'hashing');
  if (code.includes('signature')) dynamicKeywords.push('digital-signature', 'authentication');
  
  // Add AZTEC-related keywords if relevant
  if (code.includes('aztec') || code.includes('bb')) {
    dynamicKeywords.push('aztec', 'aztec-protocol', 'bb.js');
  }
  
  return [...baseKeywords, ...dynamicKeywords];
}