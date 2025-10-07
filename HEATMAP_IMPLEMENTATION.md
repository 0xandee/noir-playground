# Real-Time Circuit Complexity Metrics & Heatmaps Implementation

## Overview

This implementation adds comprehensive real-time circuit complexity visualization to the Noir Playground, providing developers with instant feedback on their code's performance characteristics through visual heatmaps and interactive hotspot navigation.

## Key Features Implemented

### 1. Monaco Editor Heat Overlay
- **Gutter heat indicators**: Colored bars showing circuit complexity
- **Inline metric badges**: Display ACIR/Brillig/Gate counts at line ends
- **Line highlighting**: Subtle background highlights for top hotspots
- **Tooltip enhancements**: Rich hover information with detailed metrics

### 2. Hotspot Navigator Panel
- **Top hotspots list**: Ranked by circuit complexity
- **Metric filtering**: ACIR opcodes, Brillig opcodes, or proving gates
- **Click-to-navigate**: Jump to problematic lines in editor
- **Function analysis**: Function-level complexity breakdown

### 3. Real-Time Updates
- **Debounced analysis**: 1-second delay after code changes
- **Background processing**: Non-blocking profiling with progress indicators
- **Caching system**: Efficient re-use of complexity reports

## Architecture

### Core Services

1. **MetricsAggregationService** (`src/services/MetricsAggregationService.ts`)
   - Processes SVG profiler output into structured metrics
   - Calculates normalized heat values (0-1 scale)
   - Identifies hotspots and tracks performance changes

2. **HeatmapDecorationService** (`src/services/HeatmapDecorationService.ts`)
   - Manages Monaco editor decorations
   - Applies gradient colors based on complexity
   - Handles gutter indicators and inline badges

3. **Enhanced NoirProfilerService** (`src/services/NoirProfilerService.ts`)
   - Integrates with existing profiler server
   - Generates comprehensive complexity reports
   - Provides caching and comparison capabilities

### UI Components

1. **Enhanced NoirEditorWithHover** (`src/components/NoirEditorWithHover.tsx`)
   - New heatmap props for configuration
   - Real-time decoration updates
   - Performance status indicators

2. **HotspotNavigator** (`src/components/complexity-analysis/HotspotNavigator.tsx`)
   - Interactive hotspot browser
   - Sorting and filtering controls
   - Function/line view modes

3. **Updated CodePlayground** (`src/components/CodePlayground.tsx`)
   - Heatmap toggle controls
   - Metric type selector (ACIR/Brillig/Gates)
   - Hotspot navigator integration

## Type System

New TypeScript interfaces in `src/types/circuitMetrics.ts`:
- `LineMetrics`: Per-line complexity data
- `CircuitComplexityReport`: Complete analysis results
- `HeatmapData`: Visualization data
- `MetricsConfiguration`: Customization options

## Usage

### Enable Heatmap View
1. Toggle the "Heatmap" switch in the editor header
2. Select metric type (ACIR/Brillig/Gates) from dropdown
3. Click the target icon to show/hide hotspot navigator

### Visual Indicators
- **Green**: Low complexity (< 33% of max)
- **Yellow**: Medium complexity (33-66% of max)  
- **Red**: High complexity (> 66% of max)

### Hotspot Navigation
- Hotspots are ranked by absolute metric value
- Click any hotspot to jump to that line
- Use filters to focus on significant hotspots

## Performance Considerations

- **Debounced updates**: Prevents excessive profiling during typing
- **Caching**: Reports cached for 5 minutes to reduce server load
- **Background processing**: Non-blocking UI with progress indicators
- **Selective rendering**: Only shows lines above configurable threshold

## Configuration Options

Default thresholds and colors can be customized via `MetricsConfiguration`:

```typescript
const config = {
  updateDebounceMs: 500,
  cacheTimeoutMs: 5 * 60 * 1000,
  gradientColors: {
    low: '#22c55e',    // Green
    medium: '#eab308', // Yellow  
    high: '#ef4444'    // Red
  }
};
```

## Future Enhancements

- **Delta visualization**: Show performance improvements/regressions
- **Function-level navigation**: Jump to function definitions
- **Constraint analysis**: Detailed constraint breakdown
- **Export capabilities**: Save complexity reports
- **Threshold customization**: User-configurable heat thresholds

## Dependencies

- Monaco Editor for code visualization
- Existing noir-playground-server for metrics
- Radix UI components for interface elements
- Tailwind CSS for styling

This implementation provides Noir developers with immediate, actionable feedback on circuit complexity, enabling faster optimization and better understanding of zero-knowledge proof performance characteristics.