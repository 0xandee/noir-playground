/**
 * SharedSnippet page component for displaying shared code snippets
 * Handles loading, error states, and integrates with CodePlayground
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { snippetService } from '../services/SnippetService';
import type { SharedSnippet } from '../types/snippet';
import CodePlayground from '../components/CodePlayground';

const SharedSnippetPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [snippet, setSnippet] = useState<SharedSnippet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Invalid snippet ID');
      setLoading(false);
      return;
    }

    const loadSnippet = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('SharedSnippet: Loading snippet with ID:', id);
        const snippetData = await snippetService.getSnippet(id);
        
        if (snippetData) {
          console.log('SharedSnippet: Snippet loaded successfully:', snippetData.title);
          setSnippet(snippetData);
        } else {
          console.log('SharedSnippet: Snippet not found with ID:', id);
          const errorMsg = 'This snippet could not be found or may have been deleted';
          setError(errorMsg);
          toast({
            title: "Snippet not found",
            description: errorMsg,
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error('SharedSnippet: Error loading snippet:', err);
        const errorMsg = 'Failed to load snippet. Please check your connection and try again.';
        setError(errorMsg);
        toast({
          title: "Failed to load snippet",
          description: errorMsg,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadSnippet();
  }, [id]);

  const handleReturnToPlayground = () => {
    navigate('/');
  };

  const handleRetry = () => {
    if (id) {
      setError(null);
      setLoading(true);
      // Trigger reload by updating the effect dependency
      const loadSnippet = async () => {
        try {
          const snippetData = await snippetService.getSnippet(id);
          if (snippetData) {
            setSnippet(snippetData);
          } else {
            const errorMsg = 'This snippet could not be found or may have been deleted';
            setError(errorMsg);
          }
        } catch (err) {
          console.error('SharedSnippet: Error loading snippet on retry:', err);
          const errorMsg = 'Failed to load snippet. Please check your connection and try again.';
          setError(errorMsg);
        } finally {
          setLoading(false);
        }
      };
      loadSnippet();
    }
  };

  // Loading state
  if (loading) {
    return (
      <main className="h-screen bg-background flex flex-col">
        <header className="sr-only">
          <h1>Loading Shared Snippet</h1>
        </header>
        
        {/* Loading Header */}
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex-1 flex">
          {/* Left Panel Skeleton */}
          <div className="flex-1 border-r border-border">
            <div className="h-full flex flex-col">
              <div className="border-b border-border p-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex-1 p-4 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>

          {/* Right Panel Skeleton */}
          <div className="flex-1">
            <div className="h-full flex flex-col">
              <div className="border-b border-border p-4">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex-1 p-4 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Unable to Load Snippet</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={handleReturnToPlayground} variant="outline">
                Return to Playground
              </Button>
              {error.includes('Failed to load') && (
                <Button onClick={handleRetry}>
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Success state - render CodePlayground with snippet data
  if (snippet) {
    // Convert snippet inputs to the format expected by CodePlayground
    const inputsAsStrings: Record<string, string> = {};
    for (const [key, value] of Object.entries(snippet.inputs)) {
      if (Array.isArray(value)) {
        inputsAsStrings[key] = JSON.stringify(value);
      } else {
        inputsAsStrings[key] = String(value);
      }
    }

    return (
      <CodePlayground
        initialCode={snippet.code}
        initialToml={snippet.toml || undefined}
        initialInputs={inputsAsStrings}
        initialProofData={
          snippet.proof || snippet.witness || snippet.publicInputs
            ? {
                proof: snippet.proof || undefined,
                witness: snippet.witness || undefined,
                publicInputs: snippet.publicInputs || undefined,
                executionTime: undefined,
                returnValue: undefined,
              }
            : undefined
        }
        snippetTitle={snippet.title}
        snippetId={snippet.id}
      />
    );
  }

  // Fallback - should not reach here
  return (
    <main className="h-screen bg-background flex items-center justify-center">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred while loading the snippet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleReturnToPlayground}>
            Return to Playground
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default SharedSnippetPage;