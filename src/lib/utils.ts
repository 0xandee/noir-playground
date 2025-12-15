import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format bytes into human-readable size string
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "245KB", "1.2MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0B';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Format duration in milliseconds into human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "450ms", "2.3s")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function getFileLanguage(filename: string) {
  if (filename.endsWith('.nr')) return 'noir';
  if (filename.endsWith('.toml')) return 'ini'; // Monaco uses 'ini' for TOML-like syntax
  return 'plaintext';
}
