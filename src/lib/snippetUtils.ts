/**
 * Utility functions for snippet data serialization and deserialization
 * Handles conversion between JavaScript objects and database formats
 */

import type { 
  SharedSnippet, 
  CreateSnippetData, 
  DatabaseSnippetRow, 
  SerializedSnippetData 
} from '../types/snippet';

/**
 * Converts Uint8Array to hex string for database storage (Supabase bytea format)
 */
function uint8ArrayToHex(uint8Array: Uint8Array): string {
  return '\\x' + Array.from(uint8Array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts hex string back to Uint8Array (from Supabase bytea format)
 */
function hexToUint8Array(hex: string): Uint8Array {
  // Remove the \x prefix if present
  const cleanHex = hex.startsWith('\\x') ? hex.slice(2) : hex;
  const bytes = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16));
  }
  return new Uint8Array(bytes);
}

/**
 * Validates snippet data before serialization
 * @param data - The snippet data to validate
 * @throws Error if validation fails
 */
function validateSnippetData(data: CreateSnippetData): void {
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    throw new Error('Title is required and must be a non-empty string');
  }
  
  if (!data.code || typeof data.code !== 'string' || data.code.trim().length === 0) {
    throw new Error('Code is required and must be a non-empty string');
  }
  
  if (!data.inputs || typeof data.inputs !== 'object' || data.inputs === null) {
    throw new Error('Inputs must be a valid object');
  }
  
  if (data.proof !== undefined && data.proof !== null && !(data.proof instanceof Uint8Array)) {
    throw new Error('Proof must be a Uint8Array or null');
  }
  
  if (data.witness !== undefined && data.witness !== null && !(data.witness instanceof Uint8Array)) {
    throw new Error('Witness must be a Uint8Array or null');
  }
  
  if (data.publicInputs !== undefined && data.publicInputs !== null && !Array.isArray(data.publicInputs)) {
    throw new Error('Public inputs must be an array or null');
  }
}

/**
 * Serializes snippet data for database storage
 * Converts CreateSnippetData to the format expected by Supabase
 * 
 * @param snippetData - The snippet data to serialize
 * @returns Serialized data ready for database insertion
 * @throws Error if validation fails or serialization encounters an error
 */
export function serializeSnippetForDatabase(snippetData: CreateSnippetData): SerializedSnippetData {
  try {
    // Validate input data
    validateSnippetData(snippetData);
    
    return {
      title: snippetData.title.trim(),
      code: snippetData.code,
      inputs: snippetData.inputs,
      proof: snippetData.proof ? uint8ArrayToHex(snippetData.proof) : null,
      witness: snippetData.witness ? uint8ArrayToHex(snippetData.witness) : null,
      public_inputs: snippetData.publicInputs || null,
    };
  } catch (error) {
    throw new Error(`Failed to serialize snippet data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deserializes snippet data from database format
 * Converts raw database rows back to SharedSnippet objects
 * 
 * @param row - Raw database row from Supabase
 * @returns Properly typed SharedSnippet object
 * @throws Error if deserialization fails
 */
export function deserializeSnippetFromDatabase(row: DatabaseSnippetRow): SharedSnippet {
  try {
    return {
      id: row.id,
      title: row.title,
      code: row.code,
      inputs: row.inputs,
      proof: row.proof ? hexToUint8Array(row.proof) : null,
      witness: row.witness ? hexToUint8Array(row.witness) : null,
      publicInputs: row.public_inputs || null,
      created_at: new Date(row.created_at),
    };
  } catch (error) {
    throw new Error(`Failed to deserialize snippet data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates that a database row has the expected structure
 * @param row - The database row to validate
 * @throws Error if validation fails
 */
export function validateDatabaseRow(row: any): asserts row is DatabaseSnippetRow {
  if (!row || typeof row !== 'object') {
    throw new Error('Database row must be an object');
  }
  
  const requiredFields = ['id', 'title', 'code', 'inputs', 'created_at'];
  for (const field of requiredFields) {
    if (!(field in row)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  if (typeof row.id !== 'string' || row.id.trim().length === 0) {
    throw new Error('ID must be a non-empty string');
  }
  
  if (typeof row.title !== 'string' || row.title.trim().length === 0) {
    throw new Error('Title must be a non-empty string');
  }
  
  if (typeof row.code !== 'string' || row.code.trim().length === 0) {
    throw new Error('Code must be a non-empty string');
  }
  
  if (typeof row.created_at !== 'string') {
    throw new Error('created_at must be a string');
  }
}