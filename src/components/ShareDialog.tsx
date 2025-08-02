/**
 * ShareDialog component for sharing code snippets
 * Allows users to selectively share code, inputs, and proof data
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { snippetService } from '../services/SnippetService';
import { previewService } from '../services/PreviewService';
import type { CreateSnippetData } from '../types/snippet';

interface ShareDialogProps {
  /** Controls dialog visibility */
  open: boolean;
  /** Dialog state handler */
  onOpenChange: (open: boolean) => void;
  /** Current Noir code to potentially share */
  code: string;
  /** Current input values */
  inputs: Record<string, any>;
  /** Optional proof and witness data */
  proofData?: {
    proof?: Uint8Array;
    witness?: Uint8Array;
  };
}

export function ShareDialog({
  open,
  onOpenChange,
  code,
  inputs,
  proofData,
}: ShareDialogProps) {
  // State management
  const [title, setTitle] = useState('');
  const [includeInputs, setIncludeInputs] = useState(true);
  const [includeProof, setIncludeProof] = useState(false);
  const [includeWitness, setIncludeWitness] = useState(false);
  const [includePublicInputs, setIncludePublicInputs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [buttonText, setButtonText] = useState('Share');
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  // Initialize toast hook
  const { toast } = useToast();

  // Initialize checkbox states based on available data
  useEffect(() => {
    if (open) {
      setIncludeProof(!!proofData?.proof);
      setIncludeWitness(!!proofData?.witness);
      setIncludePublicInputs(!!proofData?.publicInputs?.length);
      setShareUrl('');
      setButtonText('Share');
    }
  }, [open, proofData]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTitle('');
      setIncludeInputs(true);
      setIncludeProof(false);
      setIncludeWitness(false);
      setIncludePublicInputs(false);
      setIsLoading(false);
      setShareUrl('');
      setButtonText('Share');
      setCopyFeedback(false);
    }
  }, [open]);

  /**
   * Handles the share operation
   */
  const handleShare = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your snippet",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setButtonText('Sharing...');

    try {
      // Prepare snippet data based on user selections
      const snippetData: CreateSnippetData = {
        title: title.trim(),
        code: code, // Always include code
        inputs: includeInputs ? inputs : {},
        proof: includeProof && proofData?.proof ? proofData.proof : null,
        witness: includeWitness && proofData?.witness ? proofData.witness : null,
        publicInputs: includePublicInputs && proofData?.publicInputs ? proofData.publicInputs : null,
      };

      // Save snippet
      const savedSnippet = await snippetService.saveSnippet(snippetData);

      // Pre-generate preview image for better SEO (fire-and-forget)
      previewService.preGenerateSharePreview(savedSnippet).catch(error => {
        console.warn('Failed to pre-generate preview image:', error);
      });

      // Generate share URL
      const url = `${window.location.origin}/share/${savedSnippet.id}`;
      setShareUrl(url);
      setButtonText('Shared!');

      // Automatically copy to clipboard
      await navigator.clipboard.writeText(url);
      
      // Show success toast
      toast({
        title: "Snippet shared successfully!",
        description: "Share URL copied to clipboard"
      });

      console.log('Snippet shared successfully with ID:', savedSnippet.id);
    } catch (err) {
      console.error('Error sharing snippet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to share snippet';
      
      toast({
        title: "Failed to share snippet",
        description: errorMessage,
        variant: "destructive"
      });
      
      setButtonText('Share');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles dialog close
   */
  const handleDone = () => {
    onOpenChange(false);
  };

  /**
   * Copies the share URL to clipboard
   */
  const handleCopyUrl = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyFeedback(true);
      
      // Show brief feedback
      setTimeout(() => setCopyFeedback(false), 1500);
      
      toast({
        title: "URL copied!",
        description: "Share URL copied to clipboard"
      });
    } catch (err) {
      console.error('Failed to copy URL:', err);
      toast({
        title: "Copy failed",
        description: "Failed to copy URL to clipboard",
        variant: "destructive"
      });
    }
  };

  /**
   * Handles dialog close
   */
  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const hasProofData = !!proofData?.proof;
  const hasWitnessData = !!proofData?.witness;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Code Snippet</DialogTitle>
          <DialogDescription>
            Create a shareable link for your Noir code and data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="snippet-title">Title</Label>
            <Input
              id="snippet-title"
              placeholder="Enter a title for your snippet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Share Options */}
          <div className="space-y-3">
            <Label>Include in share:</Label>
            
            {/* 2x2 Grid Layout for Checkboxes */}
            <div className="grid grid-cols-2 gap-3">
              {/* Row 1, Column 1: Input values */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-inputs"
                  checked={includeInputs}
                  onCheckedChange={(checked) => setIncludeInputs(!!checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="include-inputs" className="text-sm">
                  Input values
                </Label>
              </div>

              {/* Row 1, Column 2: Proof data (if available) */}
              {hasProofData ? (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-proof"
                    checked={includeProof}
                    onCheckedChange={(checked) => setIncludeProof(!!checked)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="include-proof" className="text-sm">
                    Proof data
                  </Label>
                </div>
              ) : (
                <div></div> // Empty div to maintain grid structure
              )}

              {/* Row 2, Column 1: Witness data (if available) */}
              {hasWitnessData ? (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-witness"
                    checked={includeWitness}
                    onCheckedChange={(checked) => setIncludeWitness(!!checked)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="include-witness" className="text-sm">
                    Witness data
                  </Label>
                </div>
              ) : (
                <div></div> // Empty div to maintain grid structure
              )}

              {/* Row 2, Column 2: Public inputs (if available) */}
              {proofData?.publicInputs?.length ? (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-public-inputs"
                    checked={includePublicInputs}
                    onCheckedChange={(checked) => setIncludePublicInputs(!!checked)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="include-public-inputs" className="text-sm">
                    Public inputs
                  </Label>
                </div>
              ) : (
                <div></div> // Empty div to maintain grid structure
              )}
            </div>
          </div>

          {/* Share URL Display */}
          {shareUrl && (
            <div className="space-y-2">
              <Label htmlFor="share-url">Share URL</Label>
              <div className="relative">
                <Input
                  id="share-url"
                  value={shareUrl}
                  readOnly
                  className="w-full pr-24"
                />
                <button
                  onClick={handleCopyUrl}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors"
                  title="Copy URL"
                >
                  <Copy className={`h-4 w-4 ${copyFeedback ? 'text-green-500' : 'text-muted-foreground hover:text-foreground'}`} />
                  <span className={`text-xs ${copyFeedback ? 'text-green-500' : 'text-muted-foreground hover:text-foreground'}`}>
                    Copy link
                  </span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                URL automatically copied to clipboard
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          {shareUrl ? (
            <Button onClick={handleDone}>
              Done
            </Button>
          ) : (
            <Button
              onClick={handleShare}
              disabled={isLoading || !title.trim()}
            >
              {buttonText}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}