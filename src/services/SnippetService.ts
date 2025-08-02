/**
 * Service for managing shared code snippets
 * Handles CRUD operations for snippet data with Supabase integration
 */

import { supabase } from '../lib/supabase';
import type { 
  SharedSnippet, 
  CreateSnippetData, 
  DatabaseSnippetRow 
} from '../types/snippet';
import { 
  serializeSnippetForDatabase, 
  deserializeSnippetFromDatabase,
  validateDatabaseRow
} from '../lib/snippetUtils';

/**
 * Service class for snippet operations
 * Follows the same patterns as NoirService with comprehensive error handling
 */
class SnippetService {
  private static instance: SnippetService;

  constructor() {
    console.log('SnippetService initialized');
  }

  /**
   * Get singleton instance of SnippetService
   */
  static getInstance(): SnippetService {
    if (!SnippetService.instance) {
      SnippetService.instance = new SnippetService();
    }
    return SnippetService.instance;
  }

  /**
   * Saves a new snippet to the database
   * 
   * @param snippetData - The snippet data to save
   * @returns Promise resolving to the created SharedSnippet
   * @throws Error if validation fails or database operation fails
   */
  async saveSnippet(snippetData: CreateSnippetData): Promise<SharedSnippet> {
    console.log('SnippetService: Saving snippet with title:', snippetData.title);
    
    try {
      // Serialize the data for database storage
      const serializedData = serializeSnippetForDatabase(snippetData);
      console.log('SnippetService: Data serialized successfully');

      // Insert into database
      const { data, error } = await supabase
        .from('shared_snippets')
        .insert(serializedData)
        .select()
        .single();

      if (error) {
        console.error('SnippetService: Database error during insert:', error);
        throw new Error(`Failed to save snippet: ${error.message}`);
      }

      if (!data) {
        throw new Error('Failed to save snippet: No data returned from database');
      }

      console.log('SnippetService: Snippet saved successfully with ID:', data.id);

      // Validate and deserialize the returned data
      validateDatabaseRow(data);
      const deserializedSnippet = deserializeSnippetFromDatabase(data as DatabaseSnippetRow);
      
      return deserializedSnippet;
    } catch (error) {
      console.error('SnippetService: Error saving snippet:', error);
      throw new Error(`Failed to save snippet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves a specific snippet by ID
   * 
   * @param id - The UUID of the snippet to retrieve
   * @returns Promise resolving to SharedSnippet or null if not found
   * @throws Error if database operation fails
   */
  async getSnippet(id: string): Promise<SharedSnippet | null> {
    console.log('SnippetService: Fetching snippet with ID:', id);

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Snippet ID is required and must be a non-empty string');
    }

    try {
      const { data, error } = await supabase
        .from('shared_snippets')
        .select('*')
        .eq('id', id.trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('SnippetService: Snippet not found with ID:', id);
          return null;
        }
        console.error('SnippetService: Database error during fetch:', error);
        throw new Error(`Failed to fetch snippet: ${error.message}`);
      }

      if (!data) {
        console.log('SnippetService: No snippet found with ID:', id);
        return null;
      }

      console.log('SnippetService: Snippet fetched successfully');

      // Validate and deserialize the data
      validateDatabaseRow(data);
      const deserializedSnippet = deserializeSnippetFromDatabase(data as DatabaseSnippetRow);
      
      return deserializedSnippet;
    } catch (error) {
      console.error('SnippetService: Error fetching snippet:', error);
      throw new Error(`Failed to fetch snippet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves a list of snippets with pagination
   * 
   * @param limit - Maximum number of snippets to return (default: 20)
   * @param offset - Number of snippets to skip (default: 0)
   * @returns Promise resolving to array of SharedSnippet objects
   * @throws Error if validation fails or database operation fails
   */
  async listSnippets(limit: number = 20, offset: number = 0): Promise<SharedSnippet[]> {
    console.log(`SnippetService: Fetching snippets with limit: ${limit}, offset: ${offset}`);

    // Validate pagination parameters
    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      throw new Error('Limit must be a number between 1 and 100');
    }
    
    if (typeof offset !== 'number' || offset < 0) {
      throw new Error('Offset must be a non-negative number');
    }

    try {
      const { data, error } = await supabase
        .from('shared_snippets')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('SnippetService: Database error during list fetch:', error);
        throw new Error(`Failed to fetch snippets: ${error.message}`);
      }

      if (!data || !Array.isArray(data)) {
        console.log('SnippetService: No snippets found');
        return [];
      }

      console.log(`SnippetService: Fetched ${data.length} snippets successfully`);

      // Validate and deserialize all snippets
      const deserializedSnippets: SharedSnippet[] = [];
      for (const row of data) {
        try {
          validateDatabaseRow(row);
          const deserializedSnippet = deserializeSnippetFromDatabase(row as DatabaseSnippetRow);
          deserializedSnippets.push(deserializedSnippet);
        } catch (deserializeError) {
          console.warn('SnippetService: Failed to deserialize snippet:', row.id, deserializeError);
          // Skip invalid snippets but continue processing others
        }
      }

      return deserializedSnippets;
    } catch (error) {
      console.error('SnippetService: Error fetching snippets:', error);
      throw new Error(`Failed to fetch snippets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if the service is properly configured
   * 
   * @returns Promise resolving to boolean indicating if service is ready
   */
  async isReady(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shared_snippets')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('SnippetService: Service not ready:', error);
        return false;
      }
      
      console.log('SnippetService: Service is ready');
      return true;
    } catch (error) {
      console.error('SnippetService: Error checking service readiness:', error);
      return false;
    }
  }
}

// Export singleton instance
export const snippetService = SnippetService.getInstance();
export default snippetService;