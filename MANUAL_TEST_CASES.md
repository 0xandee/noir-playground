# Manual Test Cases: Real-Time Circuit Complexity Metrics & Heatmaps

## Overview
This document provides comprehensive manual test cases to verify the Real-Time Circuit Complexity Metrics & Heatmaps feature works correctly in the Noir Playground.

## Prerequisites
- Noir Playground running locally (`npm run dev`)
- Noir profiler server running (see [noir-playground-server](https://github.com/0xandee/noir-playground-server) repository)
- Modern browser (Chrome, Firefox, Safari, or Edge)

---

## Test Category 1: Basic Heatmap Functionality

### Test Case 1.1: Heatmap Activation
**Objective**: Verify heatmap can be enabled and disabled

**Steps**:
1. Navigate to http://localhost:8080
2. Locate the heatmap toggle switch (flame icon) in the editor header
3. Click the toggle to enable heatmap
4. Observe the editor for visual changes
5. Click toggle again to disable

**Expected Results**:
- Toggle switches between enabled/disabled states
- When enabled: Status indicator shows "Heatmap: ACIR"
- When disabled: No heat indicators visible in editor
- No errors in browser console

### Test Case 1.2: Metric Type Switching
**Objective**: Test switching between ACIR, Brillig, and Gates metrics

**Test Code**:
```noir
pub fn main(x: Field, y: pub Field) -> pub Field {
    assert(x != 0);
    assert(y != 0);
    let sum = x + y;
    assert(sum as u64 > x as u64);
    sum
}
```

**Steps**:
1. Enable heatmap
2. Enter the test code above
3. Wait for heatmap generation (orange indicator should disappear)
4. Switch metric type dropdown from "ACIR" to "Brillig"
5. Switch to "Gates"
6. Switch back to "ACIR"

**Expected Results**:
- Each metric type shows different heat patterns
- Heat indicators update within 1-2 seconds of switching
- Status indicator updates to show current metric type
- No flickering or UI glitches

---

## Test Category 2: Circuit Complexity Visualization

### Test Case 2.1: Simple Arithmetic Circuit
**Objective**: Verify basic complexity visualization

**Test Code**:
```noir
pub fn main(x: Field, y: pub Field) -> pub Field {
    let a = x + y;       // Low complexity - should be green
    let b = a * 2;       // Low complexity - should be green
    b
}
```

**Steps**:
1. Enable heatmap with ACIR metrics
2. Enter the test code
3. Wait for analysis completion

**Expected Results**:
- Gutter shows green heat indicators (▌) for lines 2-3
- Inline badges show low opcode counts (e.g., "1ops", "2ops")
- No red or yellow indicators
- Tooltips show detailed metrics on hover

### Test Case 2.2: High Complexity Circuit
**Objective**: Test visualization of expensive operations

**Test Code**:
```noir
pub fn main(x: Field, y: pub Field) -> pub Field {
    assert(x != 0);                    // Medium complexity
    assert(y != 0);                    // Medium complexity
    assert(x as u64 > 0);              // High complexity (cast + comparison)
    assert(y as u64 > x as u64);       // Very high complexity
    let product = x * y;               // Low complexity
    assert(product as u64 > 100);      // High complexity
    product
}
```

**Steps**:
1. Enable heatmap with ACIR metrics
2. Enter the test code
3. Observe heat indicators for each line

**Expected Results**:
- Lines with `assert` statements show yellow/red indicators
- Lines with casting (`as u64`) show higher heat
- Multiplication line shows lower heat (green/yellow)
- Heat intensity correlates with operation complexity
- Top 3-5 hottest lines have subtle background highlighting

### Test Case 2.3: Loop Circuit
**Objective**: Test very high complexity visualization

**Test Code**:
```noir
pub fn main(arr: [Field; 5]) -> Field {
    let mut sum = 0;
    for i in 0..5 {                    // Should show extreme heat
        sum += arr[i];                 // High heat (repeated operation)
        assert(arr[i] < 1000);         // Extreme heat (assert in loop)
    }
    sum
}
```

**Steps**:
1. Enable heatmap with ACIR metrics
2. Enter the test code
3. Observe heat indicators, particularly for loop body

**Expected Results**:
- Loop lines (3-5) show red heat indicators
- Line 5 (assert in loop) shows highest heat
- Inline badges show high opcode counts
- These lines appear in hotspot highlights

### Test Case 2.4: Function Complexity
**Objective**: Test function-level complexity aggregation

**Test Code**:
```noir
fn expensive_function(x: Field) -> Field {
    let mut result = x;
    for i in 0..3 {
        result = result * result + 1;
        assert(result > 0);
    }
    result
}

pub fn main(x: Field) -> pub Field {
    let result = expensive_function(x);    // Should aggregate function complexity
    result + 1                             // Simple operation
}
```

**Steps**:
1. Enable heatmap
2. Enter the test code
3. Observe heat patterns for both function definition and call

**Expected Results**:
- Function call line (line 11) shows high heat (aggregated)
- Loop inside function shows extreme heat
- Simple addition (line 12) shows low heat

---

## Test Category 3: Real-Time Updates

### Test Case 3.1: Debounced Updates
**Objective**: Verify updates are debounced and don't overwhelm the system

**Steps**:
1. Enable heatmap
2. Start with simple code: `pub fn main(x: Field) -> Field { x }`
3. Rapidly type additional complex operations
4. Stop typing and wait

**Expected Results**:
- Orange "Generating heatmap..." indicator appears during typing
- No heatmap updates while actively typing
- Heatmap updates ~1 second after stopping
- Final heatmap reflects all changes
- No performance lag or UI freezing

### Test Case 3.2: Incremental Complexity
**Objective**: Test heatmap updates as complexity increases

**Starting Code**:
```noir
pub fn main(x: Field) -> Field {
    x
}
```

**Steps**:
1. Enter starting code, enable heatmap
2. Add: `assert(x > 0);`
3. Wait for update
4. Add: `assert(x as u64 < 1000);`
5. Wait for update
6. Add a loop with multiple assertions

**Expected Results**:
- Each addition increases heat indicators
- Heat distribution updates correctly
- Previous low-heat lines may become relatively cooler
- Hotspot rankings update

---

## Test Category 4: Hotspot Navigator

### Test Case 4.1: Hotspot Navigator Activation
**Objective**: Test hotspot panel display and controls

**Test Code**:
```noir
pub fn main(x: Field, y: pub Field, z: Field) -> pub Field {
    assert(x != 0);           // Line 2
    assert(y != 0);           // Line 3
    assert(z != 0);           // Line 4
    assert(x as u64 > 5);     // Line 5 - should be hottest
    let sum = x + y + z;      // Line 6 - should be coolest
    sum
}
```

**Steps**:
1. Enable heatmap
2. Enter test code above
3. Click the target icon to show hotspot navigator
4. Observe the hotspot list

**Expected Results**:
- Right panel switches from complexity analysis to hotspot navigator
- Hotspots listed in descending order of complexity
- Line 5 appears at top of list
- Line 6 appears at bottom or not listed
- Each hotspot shows line number, metric value, and percentage

### Test Case 4.2: Hotspot Navigation
**Objective**: Test click-to-jump functionality

**Steps**:
1. Continue from Test 4.1
2. Click on different hotspots in the navigator
3. Observe editor behavior

**Expected Results**:
- Clicking hotspot highlights corresponding line in editor
- Editor scrolls to bring line into view
- Selected hotspot is visually highlighted in navigator
- Navigation is immediate (< 100ms)

### Test Case 4.3: Hotspot Filtering and Sorting
**Objective**: Test navigator controls

**Steps**:
1. Continue from previous test
2. Change "Min" threshold from "1+ ops" to "5+ ops"
3. Click sort button to switch between ascending/descending
4. Test different view modes if available

**Expected Results**:
- Higher threshold filters out low-complexity lines
- Sort button changes order (desc ↔ asc)
- Filter controls work immediately
- Empty state shown if no hotspots meet threshold

---

## Test Category 5: Edge Cases and Error Handling

### Test Case 5.1: Invalid Code
**Objective**: Test behavior with syntax errors

**Steps**:
1. Enable heatmap
2. Enter invalid Noir code: `pub fn main( { invalid syntax`
3. Observe behavior

**Expected Results**:
- Heatmap generation fails gracefully
- Error state shown instead of heatmap
- No browser console errors
- Editor remains functional

### Test Case 5.2: Empty Code
**Objective**: Test with no code

**Steps**:
1. Enable heatmap
2. Clear all code from editor
3. Observe behavior

**Expected Results**:
- No heat indicators shown
- Hotspot navigator shows empty state
- No errors or loading indicators
- Feature remains enabled for when code is added

### Test Case 5.3: Very Large Circuit
**Objective**: Test performance with large code

**Test Code**: Create a circuit with 100+ lines including:
- Multiple functions
- Nested loops
- Many assertions
- Array operations

**Steps**:
1. Enable heatmap
2. Paste large circuit code
3. Wait for analysis
4. Interact with hotspot navigator

**Expected Results**:
- Analysis completes within 5-10 seconds
- UI remains responsive
- Heatmap shows meaningful patterns
- Hotspot navigator scrollable and functional
- Browser doesn't freeze or crash

---

## Test Category 6: Visual Validation

### Test Case 6.1: Color Gradient Verification
**Objective**: Verify heat colors follow correct gradient

**Test Code**:
```noir
pub fn main(x: Field) -> pub Field {
    let a = x + 1;                    // Should be green (low)
    assert(x > 0);                    // Should be yellow (medium)
    assert(x as u64 < 1000);          // Should be red (high)
    x
}
```

**Steps**:
1. Enable heatmap
2. Enter test code
3. Visually inspect gutter indicators

**Expected Results**:
- Line 2: Green indicator (▌)
- Line 3: Yellow indicator (▌)
- Line 4: Red indicator (▌)
- Colors match defined gradient (green → yellow → red)
- Inline badges use matching colors

### Test Case 6.2: Badge Formatting
**Objective**: Verify metric badges display correctly

**Steps**:
1. Use code from Test 6.1
2. Observe inline badges at end of lines

**Expected Results**:
- Format: `// Nops (X%)`
- N is actual opcode count
- X% is percentage of total circuit cost
- Font is smaller, italic, and colored
- Badges don't interfere with code readability

### Test Case 6.3: Tooltip Content
**Objective**: Verify rich tooltips on hover

**Steps**:
1. Enable heatmap with complex code
2. Hover over gutter heat indicators
3. Hover over inline badges

**Expected Results**:
- Tooltips show detailed metrics breakdown
- Format: "ACIR: X ops | Brillig: Y ops | Gates: Z | A.B%"
- Information is accurate and updates with metric type
- Tooltips are readable and properly positioned

---

## Test Category 7: Integration Tests

### Test Case 7.1: Compatibility with Existing Features
**Objective**: Ensure heatmap doesn't break existing functionality

**Steps**:
1. Enable heatmap
2. Test existing hover tooltips (without heatmap indicators)
3. Test code execution (Run button)
4. Test file switching
5. Test example loading
6. Test syntax highlighting

**Expected Results**:
- All existing features work normally
- Hover tooltips still show line analysis
- Code execution works with heatmap enabled
- File switching preserves heatmap state
- Examples load and show appropriate heat patterns
- Syntax highlighting remains intact

### Test Case 7.2: Multi-File Support
**Objective**: Test behavior with Nargo.toml

**Steps**:
1. Enable heatmap
2. Switch to Nargo.toml file
3. Make changes to dependencies
4. Switch back to main.nr
5. Observe heatmap behavior

**Expected Results**:
- Heatmap disabled on non-.nr files
- Changes to Nargo.toml trigger heatmap regeneration
- Heat patterns may change based on dependency changes

### Test Case 7.3: Share Dialog Integration
**Objective**: Test sharing with heatmap data

**Steps**:
1. Create circuit with heatmap enabled
2. Open Share dialog
3. Configure sharing options
4. Create shareable link

**Expected Results**:
- Share dialog includes heatmap state if relevant
- Shared snippets can be viewed with heatmap
- No sharing functionality is broken

---

## Test Category 8: Browser Compatibility

### Test Case 8.1: Cross-Browser Testing
**Objective**: Verify functionality across browsers

**Browsers to Test**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Test Code**: Use Test Case 2.2 (High Complexity Circuit)

**Steps**:
1. Test basic heatmap functionality in each browser
2. Test hotspot navigator
3. Test performance with complex circuits

**Expected Results**:
- All browsers show identical visual results
- Performance is acceptable in all browsers
- No browser-specific errors
- Monaco editor integrations work consistently

### Test Case 8.2: Mobile Responsiveness
**Objective**: Test on mobile devices (if supported)

**Steps**:
1. Access playground on mobile device
2. Observe heatmap behavior

**Expected Results**:
- Mobile warning appears as expected
- Heatmap features gracefully disabled or adapted
- No mobile-specific errors

---

## Test Category 9: Performance Validation

### Test Case 9.1: Memory Usage
**Objective**: Monitor memory consumption

**Steps**:
1. Open browser developer tools (Memory tab)
2. Take memory snapshot
3. Enable heatmap
4. Generate heatmaps for various circuits
5. Take another memory snapshot
6. Compare usage

**Expected Results**:
- Memory increase is reasonable (< 50MB)
- No memory leaks detected
- Memory usage stabilizes

### Test Case 9.2: Rapid Switching
**Objective**: Test system under rapid interaction

**Steps**:
1. Rapidly toggle heatmap on/off (10 times)
2. Rapidly switch metric types (20 times)
3. Rapidly change code and wait for updates
4. Monitor system responsiveness

**Expected Results**:
- System remains responsive
- No UI freezing or crashing
- Final state reflects last action
- No accumulated errors

---

## Test Category 10: Accessibility

### Test Case 10.1: Keyboard Navigation
**Objective**: Test keyboard accessibility

**Steps**:
1. Use Tab key to navigate heatmap controls
2. Use Enter/Space to toggle heatmap
3. Use arrow keys in hotspot navigator
4. Test keyboard shortcuts

**Expected Results**:
- All controls are keyboard accessible
- Focus indicators are visible
- Tab order is logical
- Hotspot navigator supports keyboard navigation

### Test Case 10.2: Screen Reader Support
**Objective**: Test with screen reader

**Steps**:
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate heatmap controls
3. Listen to hotspot announcements

**Expected Results**:
- Controls have appropriate labels
- Heat levels are announced meaningfully
- Hotspot information is readable by screen reader

---

## Acceptance Criteria Checklist

### ✅ Core Functionality
- [ ] Heatmap toggle works reliably
- [ ] All three metric types (ACIR/Brillig/Gates) display correctly
- [ ] Heat indicators show appropriate colors (green → yellow → red)
- [ ] Real-time updates work with 1-second debouncing
- [ ] Hotspot navigator lists complexity hotspots correctly

### ✅ Visual Quality
- [ ] Gutter indicators are clearly visible
- [ ] Inline badges don't interfere with code readability
- [ ] Color gradient is smooth and meaningful
- [ ] Heat intensity correlates with actual circuit complexity

### ✅ Performance
- [ ] Initial heatmap generation < 3 seconds
- [ ] UI remains responsive during analysis
- [ ] Memory usage stays stable
- [ ] No performance regression in existing features

### ✅ User Experience
- [ ] Controls are intuitive and responsive
- [ ] Error states are handled gracefully
- [ ] Feature integrates seamlessly with existing UI
- [ ] Tooltips provide valuable information

### ✅ Robustness
- [ ] Handles invalid code without crashing
- [ ] Works with large circuits (100+ lines)
- [ ] Maintains state across file switches
- [ ] Compatible with all supported browsers

---

## Bug Report Template

If you encounter issues during testing, use this template:

**Bug Title**: [Brief description]

**Test Case**: [Reference test case number]

**Steps to Reproduce**:
1. [Detailed steps]

**Expected Result**: [What should happen]

**Actual Result**: [What actually happened]

**Environment**:
- Browser: [Name and version]
- OS: [Operating system]
- Playground version: [Git commit or branch]

**Screenshots**: [If applicable]

**Console Errors**: [Any error messages]

---

## Test Completion Sign-off

**Tester**: ________________  
**Date**: ________________  
**Test Environment**: ________________  
**Overall Result**: ✅ Pass / ❌ Fail  
**Notes**: ________________