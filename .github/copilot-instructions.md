# ModusToolbox Assistant - AI Coding Agent Instructions

## Project Architecture Overview

This is a Visual Studio Code extension with a dual-architecture design: a **TypeScript Node.js backend** (`extension/`) and an **Angular frontend** (`content/`) communicating via VS Code WebView messaging API.

### Key Architecture Components
- **Extension Backend**: `extension/src/extension.ts` → `MTBAssistObject` (main orchestrator)
- **Angular Frontend**: `content/src/app/` with standalone components and reactive services  
- **Communication**: Typed message passing via `comms.ts` interface shared between both apps
- **Build Integration**: Frontend builds into `extension/content/single-dist/` for single-package distribution

## Critical Development Patterns

### 1. Dual-Build System
```bash
# Full development build (run from extension/)
npm run build          # Builds Angular app, copies to extension, compiles extension
npm run watch          # Extension watch mode
npm run debug          # Build + watch for development

# Individual builds
cd ../content && npm run build    # Angular build + Gulp inline packaging
npm run compile                   # Extension-only webpack build
```

### 2. Communication Architecture
All frontend-backend communication uses typed messages defined in `src/comms.ts`:
- **Frontend → Backend**: `FrontEndToBackEndRequest` with 40+ message types
- **Backend → Frontend**: `BackEndToFrontEndResponse` with 35+ response types
- **Implementation**: `BackendService` (Angular) ↔ WebView messaging ↔ `MTBAssistObject` (extension)

Example pattern:
```typescript
// Frontend (BackendService)
this.sendRequestWithArgs('createProject', projectData);

// Backend (MTBAssistObject)  
private cmdhandler_: Map<FrontEndToBackEndType, (data: any) => Promise<void>>
```

### 3. Angular Frontend Patterns
- **Standalone Components**: No NgModules, uses `standalone: true`
- **Reactive Services**: RxJS `BehaviorSubject` for state management in `BackendService`
- **Platform Abstraction**: Multiple "pipes" (`VSCodePipe`, `BrowserPipe`, `ElectronPipe`) for deployment flexibility
- **Material Design**: Extensive use of Angular Material components

### 4. Extension Backend Patterns  
- **Singleton Pattern**: `MTBAssistObject.initInstance()` creates single extension instance
- **Service Management**: Extensive manager classes in `extobj/` (IntelliSenseMgr, MTBTasks, etc.)
- **MTBEnv System**: Complex ModusToolbox environment management in `mtbenv/` 
- **Winston Logging**: Structured logging with custom transports

## Development Workflows

### Adding New Features
1. **Define Communication**: Update `comms.ts` with new message types
2. **Backend Handler**: Add message handler to `MTBAssistObject.cmdhandler_` map
3. **Frontend Service**: Add method to `BackendService` for sending requests
4. **UI Component**: Create/update Angular component with reactive data binding

### Working with Shared Code
- `comms.ts` is the single source of truth for interfaces - shared between apps
- Extension build copies this file: `"copyshared": "cp ../content/src/comms.ts src"`
- Always update the content version first, then run extension build

### Extension Dependencies & Commands
```json
// Key VS Code extension dependencies
"extensionDependencies": [
    "llvm-vs-code-extensions.vscode-clangd",  // Intellisense provider
    "marus25.cortex-debug"                    // ARM debugging
]

// Main commands (see package.json contributes.commands)
mtbassist2.mtbMainPage                // Show main assistant panel
mtbassist2.mtbSetIntellisenseProject  // Configure C/C++ intellisense  
mtbassist2.mtbSymbolDoc              // Symbol documentation (Ctrl+Shift+F1)
```

### Task System Integration
```bash
# VS Code tasks available (see .vscode/tasks.json equivalent)
npm: 0          # Watch mode (background)
shell: build    # Full build command
```

## File Organization Patterns

### Extension Structure (`extension/`)
- `src/extension.ts` - Entry point, minimal activation
- `src/extobj/` - Core service objects (`mtbassistobj.ts` main orchestrator)  
- `src/mtbenv/` - ModusToolbox environment management system
- `src/comms.ts` - **Critical**: Shared communication interface
- `content/single-dist/index.html` - Built Angular app (inlined bundle)

### Angular Structure (`content/`)
- `src/app/app.ts` - Main component with theme/mode switching
- `src/app/backend/backend-service.ts` - **Core**: Communication and state management
- `src/app/backend/pipes/` - Platform-specific communication implementations
- `src/app/` - Feature components (all standalone with Material Design)

## Common Gotchas

### Build Dependencies
- Extension build **must** run content build first (`npm run content`)  
- Gulp inlines all assets into single HTML file for WebView deployment
- Webpack externals: `vscode` module cannot be bundled, stays external

### Communication Debugging
- Use `this.sendRequestWithArgs('logMessage', {message, type})` for frontend logging
- Backend logs via Winston to VS Code Output Channel
- Message flow: Angular → VSCodePipe → WebView → MTBAssistObject handlers

### VS Code WebView Constraints
- Content Security Policy restrictions require inlined CSS/JS
- Local file access only - no external HTTP requests from WebView
- State persistence handled via `retainContextWhenHidden: true`

## ModusToolbox Domain Context

This extension assists with **ModusToolbox** embedded development (ARM Cortex microcontrollers):
- **BSPs**: Board Support Packages for different hardware kits
- **Code Examples**: Template projects for various MCU peripherals  
- **Device Configurators**: Hardware pin/clock configuration tools
- **Library Manager**: Middleware and driver dependency management
- **Build System**: Make-based with complex dependency resolution

Understanding this domain helps when working on project creation, asset management, and tool integration features.