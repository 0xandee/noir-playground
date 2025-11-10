import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { OptimizationSuggestion } from '@/types/optimizationInsights';

interface SuggestionCardProps {
  suggestion: OptimizationSuggestion;
  onLineClick?: (lineNumber: number) => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onLineClick,
}) => {
  const handleLineClick = () => {
    if (suggestion.lineNumber > 0 && onLineClick) {
      onLineClick(suggestion.lineNumber);
    }
  };

  const hasCodeDetails =
    suggestion.codeSnippet || suggestion.suggestedFix || suggestion.learnMoreUrl;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        {/* Title */}
        <h3 className="font-semibold text-sm mb-2">
          {suggestion.title}
        </h3>

        {/* Line Number */}
        {suggestion.lineNumber > 0 && (
          <button
            onClick={handleLineClick}
            className="text-xs text-muted-foreground hover:text-primary transition-colors mb-2 inline-block"
          >
            Line {suggestion.lineNumber} →
          </button>
        )}

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-2">
          {suggestion.description}
        </p>

        {/* Details */}
        {hasCodeDetails && (
          <div className="border-t pt-2 space-y-2">
            {/* Code Snippet */}
            {suggestion.codeSnippet && (
              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                <code>{suggestion.codeSnippet}</code>
              </pre>
            )}

            {/* Suggested Fix */}
            {suggestion.suggestedFix && (
              <div>
                <p className="text-xs text-green-600 mb-1">Suggested:</p>
                <pre className="p-2 rounded text-xs overflow-x-auto">
                  <code>{suggestion.suggestedFix}</code>
                </pre>
              </div>
            )}

            {/* Learn More Link */}
            {suggestion.learnMoreUrl && (
              <a
                href={suggestion.learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Learn more
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
