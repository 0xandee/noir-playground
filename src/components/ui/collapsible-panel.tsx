import { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ResizablePanel } from './resizable';
import { cn } from '@/lib/utils';

interface CollapsiblePanelProps {
  id: string;
  title: string;
  icon: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode;
  direction?: 'horizontal' | 'vertical';
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
}

export function CollapsiblePanel({
  id,
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  className,
  headerActions,
  direction = 'vertical',
  defaultSize,
  minSize,
  maxSize,
}: CollapsiblePanelProps) {
  const ChevronIcon = isExpanded
    ? (direction === 'horizontal' ? ChevronLeft : ChevronUp)
    : (direction === 'horizontal' ? ChevronRight : ChevronDown);

  // When collapsed, show minimal size
  const panelSize = isExpanded ? defaultSize : (direction === 'horizontal' ? 4 : 3);
  const panelMinSize = isExpanded ? minSize : (direction === 'horizontal' ? 4 : 3);

  return (
    <ResizablePanel
      defaultSize={panelSize}
      minSize={panelMinSize}
      maxSize={isExpanded ? maxSize : panelMinSize}
      className={cn("flex flex-col", className)}
      id={id}
    >
      <div className="flex items-center justify-between px-2 py-1 min-h-[44px] bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-1 py-0.5 rounded-sm transition-colors"
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} panel`}
          >
            {icon}
            <span className="text-sm font-medium">{title}</span>
            <ChevronIcon className="h-4 w-4" />
          </button>
        </div>
        {isExpanded && headerActions && (
          <div className="flex items-center gap-1">
            {headerActions}
          </div>
        )}
      </div>

      {isExpanded ? (
        <div className="flex-1 min-h-0">
          {children}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 hover:text-foreground transition-colors p-2 text-xs"
            aria-label={`Expand ${title} panel`}
          >
            {icon}
            <span>{title}</span>
          </button>
        </div>
      )}
    </ResizablePanel>
  );
}