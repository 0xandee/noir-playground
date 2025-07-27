import { Buffer } from 'buffer';
import process from 'process';

// Make Buffer and process available globally
(globalThis as any).Buffer = Buffer;
(globalThis as any).process = process;

export {};