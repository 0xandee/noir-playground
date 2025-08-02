/**
 * Type definitions for snippet sharing functionality
 */

/**
 * SharedSnippet interface mapping directly to the database schema
 * Represents a complete snippet as stored in and retrieved from the database
 */
export interface SharedSnippet {
  /** UUID identifier for the snippet */
  id: string;
  
  /** Human-readable title for the snippet */
  title: string;
  
  /** The Noir source code */
  code: string;
  
  /** Input values for the Noir program - matches pattern from NoirExample */
  inputs: Record<string, any>;
  
  /** Optional binary proof data */
  proof: Uint8Array | null;
  
  /** Optional binary witness data */
  witness: Uint8Array | null;
  
  /** Optional public inputs from proof execution */
  publicInputs: string[] | null;
  
  /** Timestamp when the snippet was created */
  created_at: Date;
}

/**
 * CreateSnippetData interface for data needed when creating new snippets
 * Excludes auto-generated fields (id, created_at)
 */
export interface CreateSnippetData {
  /** Human-readable title for the snippet */
  title: string;
  
  /** The Noir source code */
  code: string;
  
  /** Input values for the Noir program */
  inputs: Record<string, any>;
  
  /** Optional binary proof data */
  proof?: Uint8Array | null;
  
  /** Optional binary witness data */
  witness?: Uint8Array | null;
  
  /** Optional public inputs from proof execution */
  publicInputs?: string[] | null;
}

/**
 * Database row format for serialization
 * Represents the raw data structure as stored in Supabase
 */
export interface DatabaseSnippetRow {
  id: string;
  title: string;
  code: string;
  inputs: any; // JSON field in database
  proof: string | null; // hex encoded binary data
  witness: string | null; // hex encoded binary data
  public_inputs: any; // JSON array field in database
  created_at: string; // ISO timestamp string
}

/**
 * Serialized snippet data ready for database insertion
 */
export interface SerializedSnippetData {
  title: string;
  code: string;
  inputs: any;
  proof: string | null; // hex encoded
  witness: string | null; // hex encoded
  public_inputs: any; // JSON array
}