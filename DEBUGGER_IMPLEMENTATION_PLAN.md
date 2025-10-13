# Noir Playground Debugger Implementation Plan

## Overview
Implement runtime witness value probing and code-to-constraint inspector using `nargo debug` (DAP) infrastructure.

## Phase 1: Server-Side DAP Infrastructure (noir-playground-server)

### 1.1 Add Debug API Endpoints
- [ ] `POST /api/debug/start` - Initialize debug session (compile + prepare inputs)
- [ ] `POST /api/debug/step` - Execute stepping commands (next, into, out, continue)
- [ ] `GET /api/debug/variables/:sessionId` - Get current variable state
- [ ] `GET /api/debug/witness/:sessionId` - Get witness map
- [ ] `GET /api/debug/opcodes/:sessionId` - Get ACIR opcode listing
- [ ] `DELETE /api/debug/:sessionId` - Cleanup debug session

### 1.2 DAP Process Manager
- [ ] Create `DebugSessionManager` service to spawn/manage `nargo dap` processes
- [ ] Implement stdin/stdout communication with DAP JSON protocol
- [ ] Session isolation with UUID-based temporary directories
- [ ] Automatic cleanup after 10 minutes of inactivity
- [ ] Handle DAP initialization sequence (initialize → launch → configurationDone)
- [ ] Parse DAP responses (stopped events, variable trees, stack traces)

### 1.3 WebSocket Support (Optional Enhancement)
- [ ] For real-time stepping without polling
- [ ] Bidirectional communication for step commands + state updates

## Phase 2: Client-Side Debugger Service (noir-playground)

### 2.1 Create NoirDebuggerService
```typescript
class NoirDebuggerService {
  async startSession(code, cargoToml, inputs): Promise<DebugSession>
  async step(sessionId, command: 'next' | 'into' | 'out' | 'continue')
  async getVariables(sessionId): Promise<VariableTree>
  async getWitnessMap(sessionId): Promise<Record<string, string>>
  async setBreakpoint(sessionId, line: number)
  async stopSession(sessionId)
}
```

**Tasks:**
- [ ] Create `src/services/NoirDebuggerService.ts`
- [ ] Implement HTTP client for debug API endpoints
- [ ] Add TypeScript types for debug state (`DebugSession`, `VariableTree`, etc.)
- [ ] Error handling for network/debug failures

### 2.2 Debug State Management
- [ ] Create React context or Zustand store for debug state
- [ ] Track: current line, opcode index, variables, witnesses, call stack
- [ ] Handle step-by-step state updates from server
- [ ] Implement state sync/polling mechanism

## Phase 3: UI Components

### 3.1 Debug Control Panel
- [ ] Create `DebugControlPanel` component
- [ ] Start/Stop debugging button
- [ ] Step controls (Next, Into, Out, Continue)
- [ ] Current execution status display (running, paused, stopped)
- [ ] Breakpoint management UI (list + remove)

### 3.2 Side-by-Side Inspector View
**Left Panel: Source code editor with:**
- [ ] Current line highlighting (different color than heatmap)
- [ ] Breakpoint gutters (click to toggle)
- [ ] Variable value tooltips on hover

**Right Panel: Tabbed interface with:**
- [ ] **Variables Tab:** Tree view of current variables
- [ ] **Witnesses Tab:** Complete witness map with search
- [ ] **Constraints Tab:** ACIR opcode view with current position
- [ ] **Call Stack Tab:** Function call hierarchy

### 3.3 WitnessInspector Component
- [ ] Create `WitnessInspector` component
- [ ] Display witness index → value mapping
- [ ] Highlight witnesses corresponding to visible variables
- [ ] Search/filter functionality for large witness maps
- [ ] Format witness values (hex, decimal, field element)

### 3.4 ConstraintMapView Component
- [ ] Create `ConstraintMapView` component
- [ ] Side-by-side display of source line ↔ ACIR opcodes
- [ ] Visual connection lines showing mapping
- [ ] Opcode detail tooltip (type, operands, result)
- [ ] Highlight current opcode during execution

## Phase 4: Integration with Existing Playground

### 4.1 Add Debug Mode Toggle
- [ ] New "Debug" button in CodePlayground toolbar
- [ ] Separate execution path: debug vs. normal execution
- [ ] Disable debug mode for proof generation (instrumentation overhead)
- [ ] UI state to show debug/normal mode

### 4.2 Enhance Execution Flow
- [ ] Update `NoirService.executeCircuit()` to support debug parameter
- [ ] Route to `NoirDebuggerService` when debug mode enabled
- [ ] Preserve existing prove/verify flow for normal execution
- [ ] Handle debug execution results in CodePlayground state

### 4.3 UI Layout Updates
- [ ] Expandable debug panels (collapse when not debugging)
- [ ] Responsive layout for inspector views
- [ ] Persist debug panel preferences in localStorage
- [ ] Handle mobile/tablet layouts

## Phase 5: Advanced Features (Future Enhancements)

### 5.1 Visual Constraint Graph
- [ ] Interactive graph showing witness dependencies
- [ ] Highlight constraint satisfaction path
- [ ] Click witness nodes to see related code

### 5.2 Time-Travel Debugging
- [ ] Record complete execution trace
- [ ] Step backward through execution
- [ ] Diff witness states between steps

### 5.3 Conditional Breakpoints
- [ ] Break when witness value matches condition
- [ ] Break on specific ACIR opcode types

### 5.4 Export Debug Traces
- [ ] Save execution trace to JSON
- [ ] Share debug sessions via URL
- [ ] Replay traces for education/debugging

## Technical Requirements

### Environment Variables
```bash
VITE_DEBUG_SERVER_URL=http://localhost:4000  # Same as profiler server
```

### Dependencies
- **Server:** No new npm dependencies (uses native `nargo dap`)
- **Client:** May add DAP client library (optional, can use custom implementation)

### Testing Strategy
- [ ] Unit tests for DAP message parsing/formatting
- [ ] Integration tests for debug session lifecycle
- [ ] E2E tests with Playwright for debug UI flows
- [ ] Manual testing with various circuit complexities

## Implementation Priority

### High Priority (MVP)
- ✅ Phase 1: Server-side DAP endpoints
- ✅ Phase 2: Client debugger service
- ✅ Phase 3.1 & 3.2: Basic debug UI (controls + side-by-side view)

### Medium Priority
- Phase 3.3 & 3.4: Enhanced inspector components
- Phase 4: Full integration with existing playground

### Low Priority (Future)
- Phase 5: Advanced features (visual graphs, time-travel)

## Expected Outcomes

✅ **Runtime witness value probing** - View witness values at any execution point
✅ **Code-to-constraint inspector** - Visual mapping between Noir code and ACIR opcodes
✅ **Educational value** - Help users understand how ZK circuits work
✅ **Debugging capability** - Identify constraint violations and logic errors

## Key Insights

### Why This Works Well
The Debug Adapter Protocol is transport-agnostic (JSON over stdin/stdout or WebSockets), making it perfect for a web-based playground. We can spawn `nargo dap` processes server-side and proxy commands from the browser, exactly like the current profiler architecture.

### Architecture Advantage
By leveraging DAP, we get a standardized protocol that already handles complexity like variable scoping, stack frames, and breakpoint management - no need to reverse-engineer Noir's internal execution model.

### Technical Considerations

**Compiler Instrumentation:**
- Nargo adds debug instrumentation during compilation (via `__debug_var_assign` foreign calls)
- Can be disabled with `--skip-instrumentation` flag
- Adds slight overhead to circuit size (acceptable for debug mode)

**DAP Message Format:**
```
Content-Length: 119\r\n
\r\n
{"seq": 153, "type": "request", "command": "next", "arguments": {"threadId": 3}}
```

**Session Lifecycle:**
1. Client → POST /api/debug/start (code, inputs)
2. Server spawns `nargo dap` process
3. Server sends: initialize → launch → setBreakpoints → configurationDone
4. Client sends step commands
5. Server proxies to DAP process, returns state updates
6. Client → DELETE /api/debug/:sessionId to cleanup

## Progress Tracking

**Current Phase:** Phase 1 - Server-Side DAP Infrastructure
**Started:** 2025-10-12
**Target Completion:** TBD

### Blockers
- None currently

### Notes
- Leveraging existing noir-playground-server architecture
- Following same pattern as profiler integration
- DAP specification: https://microsoft.github.io/debug-adapter-protocol/
