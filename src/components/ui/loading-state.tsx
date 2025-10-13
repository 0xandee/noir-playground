import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message: string;
  subtitle?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  subtitle,
  className = ""
}) => {
  return (
    <div className={`flex items-center justify-center p-8 min-h-[300px] ${className}`}>
      <div className="text-center text-muted-foreground">
        <Loader2 className="h-8 w-8 mx-auto mb-3 opacity-50 animate-spin" />
        <p>{message}</p>
        {subtitle && (
          <p className="mt-1 text-xs">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
