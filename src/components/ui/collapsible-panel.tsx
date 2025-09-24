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

  // Always use default size since panel is no longer collapsible
  const panelSize = defaultSize;
  const panelMinSize = minSize;

  return (
    <ResizablePanel
      defaultSize={panelSize}
      minSize={panelMinSize}
      maxSize={maxSize}
      className={cn("flex flex-col", className)}
      id={id}
    >
      <div className="flex items-center justify-between px-4 py-2 min-h-[44px] bg-muted/30 ">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {/* {icon} */}
            <span className="text-sm font-medium">{title}</span>
          </div>
        </div>
        {headerActions && (
          <div className="flex items-center gap-1">
            {headerActions}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {children}
      </div>
    </ResizablePanel>
  );
}