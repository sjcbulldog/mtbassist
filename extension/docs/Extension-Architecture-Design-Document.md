# ModusToolbox Assistant VS Code Extension - Architecture Design Document

## 1. Overview

The ModusToolbox Assistant is a comprehensive Visual Studio Code extension that provides an integrated development environment for ModusToolbox-based projects. The extension follows a client-server architecture pattern with a TypeScript-based backend extension and an Angular frontend application communicating through VS Code's WebView messaging API.

### 1.1 Architecture Principles

- **Separation of Concerns**: Clear separation between frontend UI logic and backend extension functionality
- **Event-Driven Communication**: Asynchronous message-passing architecture using typed interfaces
- **Platform Abstraction**: Support for multiple deployment platforms (VS Code, Electron, Browser)
- **Type Safety**: Comprehensive TypeScript typing across the entire application
- **Reactive Programming**: RxJS-based state management in the frontend
- **Modular Design**: Loosely coupled components with well-defined interfaces

### 1.2 High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                     VS Code Extension                      │
├─────────────────────────────────────────────────────────────┤
│  TypeScript Backend (Node.js Runtime)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Extension Core │  │   MTBEnv System │  │ Tool Manager │ │
│  │  (mtbassistobj) │  │   (mtbenv/)     │  │ (extobj/)    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   WebView Messaging                        │
├─────────────────────────────────────────────────────────────┤
│  Angular Frontend (Browser Runtime)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Backend Service│  │  UI Components  │  │ Routing      │ │
│  │  (backend-      │  │  (app/*)        │  │ (app.routes) │ │
│  │   service.ts)   │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 2. Backend Architecture (TypeScript Extension)

### 2.1 Extension Entry Point

**File**: `src/extension.ts`

The extension follows VS Code's standard activation pattern:

```typescript
export async function activate(context: vscode.ExtensionContext) {
    MTBAssistObject.initInstance(context);
}
```

### 2.2 Core Extension Object

**File**: `src/extobj/mtbassistobj.ts`

The `MTBAssistObject` is the central orchestrator implementing the Singleton pattern:

```typescript
export class MTBAssistObject {
    private static instance_: MTBAssistObject | undefined = undefined;
    private panel_: vscode.WebviewPanel | undefined = undefined;
    private cmdhandler_: Map<FrontEndToBackEndType, (data: any) => Promise<void>>;
    
    public static initInstance(context: vscode.ExtensionContext): MTBAssistObject {
        if (!MTBAssistObject.instance_) {
            MTBAssistObject.instance_ = new MTBAssistObject(context);
        }
        return MTBAssistObject.instance_;
    }
}
```

#### 2.2.1 Key Responsibilities

- **WebView Management**: Creates and manages WebView panels
- **Command Registration**: Registers VS Code commands and menu items
- **Message Routing**: Routes messages between frontend and backend subsystems
- **State Management**: Maintains extension state and settings
- **Resource Management**: Manages file system access and tool execution

#### 2.2.2 WebView Creation Process

```typescript
private showLocalContent(filename: string) {
    let p: string = path.join(this.context_.extensionUri.fsPath, 'content', filename);
    let fullpath: vscode.Uri = vscode.Uri.file(p);

    if (!this.panel_) {
        this.panel_ = vscode.window.createWebviewPanel(
            'mtbassist.welcome',
            'ModusToolbox Assistant',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
            }
        );

        let data = fs.readFileSync(fullpath.fsPath, 'utf8');
        this.panel_.webview.html = data;

        this.panel_.webview.onDidReceiveMessage((message) => {
            let handler = this.cmdhandler_.get(message.request);
            if (handler) {
                handler(message);
            }
        });
    }
}
```

### 2.3 Subsystem Architecture

#### 2.3.1 MTBEnv System
**Location**: `src/mtbenv/`

Manages ModusToolbox environment detection, tool discovery, and project metadata. See the [MTBEnv Design Document](MTBEnv-Design-Document.md) for detailed information.

#### 2.3.2 Extension Objects
**Location**: `src/extobj/`

- **Settings Manager**: `mtbsettings.ts` - Extension and workspace settings
- **Task Manager**: `mtbtasks.ts` - VS Code task integration
- **Recent Projects**: `mtbrecent.ts` - Recent project history
- **IntelliSense**: `intellisense.ts` - Code completion integration
- **LLVM Installer**: `llvminstaller.ts` - Compiler installation management

### 2.4 Communication Layer

**File**: `src/comms.ts`

Defines the complete communication contract between frontend and backend:

```typescript
export type FrontEndToBackEndType = 
    'logMessage' | 'getCodeExamples' | 'createProject' | 'loadWorkspace' |
    'browseForFolder' | 'updateSetting' | 'fixMissingAssets' | 'buildAction' |
    // ... 40+ message types

export type BackEndToFrontEndType =
    'createProjectProgress' | 'appStatus' | 'sendActiveBSPs' | 'sendCodeExamples' |
    'recentlyOpened' | 'devKitStatus' | 'installProgress' | 'settings' |
    // ... 35+ response types

export interface FrontEndToBackEndRequest {
    request: FrontEndToBackEndType;
    data: any;
}

export interface BackEndToFrontEndResponse {
    response: BackEndToFrontEndType;
    data: any;
}
```

## 3. Frontend Architecture (Angular Application)

### 3.1 Application Bootstrap

**File**: `content/src/main.ts`

Uses Angular's standalone bootstrap approach:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```

### 3.2 Application Configuration

**File**: `content/src/app/app.config.ts`

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
  ]
};
```

### 3.3 Backend Service (Communication Hub)

**File**: `content/src/app/backend/backend-service.ts`

The `BackendService` is the central communication orchestrator implementing reactive patterns:

#### 3.3.1 Service Architecture

```typescript
@Injectable({
    providedIn: 'root'
})
export class BackendService {
    private pipe_?: PipeInterface;
    private handlers_: Map<string, (cmd: BackEndToFrontEndResponse) => void>;
    
    // Reactive state observables
    theme: BehaviorSubject<ThemeType> = new BehaviorSubject<ThemeType>('dark');
    appStatusData: BehaviorSubject<ApplicationStatusData | null>;
    mtbMode: BehaviorSubject<MTBAssistantMode>;
    // ... 40+ reactive state properties
}
```

#### 3.3.2 Platform Abstraction Layer

The service uses a pipe-based architecture to support multiple platforms:

```typescript
private createPipe(): PipeInterface | undefined {
    if (typeof acquireVsCodeApi === 'function') {
        return new VSCodePipe();
    }
    else if (this.isElectron()) {
        return new ElectronPipe();
    }
    else {
        return new BrowserPipe();
    }
}
```

### 3.4 Communication Pipes

#### 3.4.1 VS Code Pipe
**File**: `content/src/app/backend/pipes/vscodePipe.ts`

Implements WebView communication using VS Code's messaging API:

```typescript
export class VSCodePipe implements PipeInterface {
    private vscode = acquireVsCodeApi();
    
    registerResponseHandler(handler: (response: BackEndToFrontEndResponse) => void): void {
        this.responseHandler = handler;
        window.addEventListener('message', (event) => {
            if (event?.data?.response && this.responseHandler) {
                this.responseHandler(event.data);
            }
        });
    }

    sendRequest(command: FrontEndToBackEndRequest): void {
        this.vscode.postMessage(command);
    }
}
```

#### 3.4.2 Browser and Electron Pipes
- **BrowserPipe**: HTTP-based communication for web deployment
- **ElectronPipe**: IPC-based communication for Electron deployment

### 3.5 UI Component Architecture

The frontend uses Angular Material Design with standalone components:

#### 3.5.1 Main Application Components

- **Getting Started**: `app/getting-started/` - Onboarding experience
- **Create Project**: `app/create-project/` - Project creation wizard
- **Application Status**: `app/application-status/` - Project and tool status
- **DevKit List**: `app/devkit-list/` - Hardware development kit management
- **Settings Editor**: `app/settings-editor/` - Configuration management
- **Memory Usage**: `app/memory-usage/` - Memory analysis tools

#### 3.5.2 Reactive Data Flow

```typescript
// Example: Application Status Component
export class ApplicationStatus implements OnInit {
    constructor(private backend: BackendService) {}
    
    ngOnInit() {
        this.backend.appStatusData.subscribe(data => {
            this.processApplicationData(data);
        });
        
        this.backend.sendRequestWithArgs('app-data', null);
    }
}
```

## 4. Communication Architecture

### 4.1 Message Flow Pattern

```
Frontend Component
       │
       ▼
Backend Service (sendRequestWithArgs)
       │
       ▼
VSCode Pipe (postMessage)
       │
       ▼
WebView Message Event
       │
       ▼
MTBAssistObject (onDidReceiveMessage)
       │
       ▼
Command Handler Map
       │
       ▼
Specific Handler Method
       │
       ▼
Business Logic Processing
       │
       ▼
Response Generation (postWebViewMessage)
       │
       ▼
WebView postMessage
       │
       ▼
Frontend Window Message Event
       │
       ▼
VSCode Pipe Event Handler
       │
       ▼
Backend Service Message Processor
       │
       ▼
Registered Handler
       │
       ▼
BehaviorSubject Update
       │
       ▼
Component Template Update
```

### 4.2 Type Safety and Contracts

The communication system ensures type safety through:

1. **Shared Type Definitions**: Identical `comms.ts` files in both projects
2. **Exhaustive Union Types**: All possible message types defined as union types
3. **Interface Contracts**: Structured data interfaces for complex payloads
4. **Handler Registration**: Type-safe handler registration system

### 4.3 Error Handling and Logging

```typescript
// Frontend error handling
private messageProc(cmd: BackEndToFrontEndResponse) {
    const handler = this.handlers_.get(cmd.response);
    if (!handler) {
        this.error(`No handler found for command: ${cmd.response}`);
        return;
    }
    
    try {
        handler(cmd);
    } catch (err) {
        this.error(`Error in handler for ${cmd.response}: ${err.message}`);
    }
}

// Backend error handling
this.panel_.webview.onDidReceiveMessage((message) => {
    try {
        let handler = this.cmdhandler_.get(message.request);
        if (handler) {
            handler(message);
        }
    } catch (err) {
        this.logger_.error(`Error handling message: ${err.message}`);
    }
});
```

## 5. Build and Deployment Architecture

### 5.1 Backend Build System

**File**: `extension/webpack.config.js`

Uses Webpack for TypeScript compilation and bundling:

```javascript
module.exports = {
    target: 'node',
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: 'ts-loader'
        }]
    }
};
```

### 5.2 Frontend Build System

**File**: `content/angular.json`

Uses Angular CLI build system with custom configurations for WebView deployment:

```json
{
  "build": {
    "builder": "@angular-devkit/build-angular:browser",
    "options": {
      "outputPath": "../extension/content/single-dist",
      "index": "src/index.html",
      "main": "src/main.ts",
      "styles": ["src/styles.scss"]
    }
  }
}
```

### 5.3 Content Integration

The frontend builds into the extension's content directory, enabling:

1. **Single Package Distribution**: Complete application in one VSIX file
2. **Offline Operation**: No external dependencies required
3. **Performance**: Local file access without network requests

## 6. Security and Sandboxing

### 6.1 WebView Security Model

```typescript
this.panel_ = vscode.window.createWebviewPanel(
    'mtbassist.welcome',
    'ModusToolbox Assistant',
    vscode.ViewColumn.One,
    {
        enableScripts: true,
        // Note: Deliberately permissive for functionality
        // Production would include CSP restrictions
    }
);
```

### 6.2 Message Validation

```typescript
// Input validation in message handlers
private setConfig(request: FrontEndToBackEndRequest): Promise<void> {
    if (!request.data || typeof request.data !== 'object') {
        throw new Error('Invalid configuration data');
    }
    // Process validated data
}
```

## 7. State Management

### 7.1 Backend State

- **Extension Context**: Persistent storage via VS Code's global/workspace state
- **Environment Cache**: In-memory caching of environment data
- **Tool State**: Dynamic tool availability and status tracking

### 7.2 Frontend State

- **BehaviorSubjects**: Reactive state containers with initial values
- **Service Injection**: Shared state across components via dependency injection
- **Local State**: Component-specific state for UI interactions

## 8. Testing Strategy

### 8.1 Backend Testing

```typescript
// Example test structure
describe('MTBAssistObject', () => {
    let extensionContext: vscode.ExtensionContext;
    let assistant: MTBAssistObject;
    
    beforeEach(() => {
        // Mock VS Code context
        extensionContext = createMockContext();
        assistant = MTBAssistObject.initInstance(extensionContext);
    });
    
    it('should initialize command handlers', () => {
        // Test command registration
    });
});
```

### 8.2 Frontend Testing

```typescript
// Angular component testing
describe('ApplicationStatusComponent', () => {
    let component: ApplicationStatus;
    let backend: jasmine.SpyObj<BackendService>;
    
    beforeEach(() => {
        const spy = jasmine.createSpyObj('BackendService', ['sendRequestWithArgs']);
        TestBed.configureTestingModule({
            providers: [{ provide: BackendService, useValue: spy }]
        });
    });
});
```

## 9. Performance Considerations

### 9.1 Lazy Loading

```typescript
// Lazy environment loading
public async initialize(): Promise<void> {
    if (!this.envLoaded_) {
        await this.loadEnvironment();
        this.envLoaded_ = true;
    }
}
```

### 9.2 Message Batching

```typescript
// Debounced status updates
private sendStatusUpdate = debounce(() => {
    this.sendMessageWithArgs('appStatus', this.getAppStatusFromEnv());
}, 100);
```

### 9.3 Memory Management

- **Event Cleanup**: Proper disposal of event listeners
- **WebView Lifecycle**: Clean disposal of WebView resources
- **Cache Management**: Intelligent caching with expiration

## 10. Extension Points and Customization

### 10.1 Command Contribution

```json
// package.json command definitions
"contributes": {
    "commands": [
        {
            "command": "mtbassist2.mtbMainPage",
            "title": "ModusToolbox Assistant"
        }
    ],
    "keybindings": [
        {
            "command": "mtbassist2.mtbMainPage",
            "key": "ctrl+shift+m"
        }
    ]
}
```

### 10.2 Settings Contribution

```json
"contributes": {
    "configuration": {
        "title": "ModusToolbox Assistant",
        "properties": {
            "mtbassist.toolsPath": {
                "type": "string",
                "description": "Path to ModusToolbox tools"
            }
        }
    }
}
```

## 11. Debugging and Development

### 11.1 Logging Architecture

```typescript
// Structured logging with multiple transports
this.logger_ = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.prettyPrint()
    ),
    transports: [
        new ConsoleTransport(),
        new VSCodeTransport(this.channel_),
    ]
});
```

### 11.2 Development Workflow

1. **Backend Development**: Use F5 debugging in VS Code Extension Host
2. **Frontend Development**: Angular CLI with live reload
3. **Integration Testing**: Manual testing in Extension Development Host
4. **Package Testing**: VSIX generation and installation testing

## 12. Future Architecture Considerations

### 12.1 Scalability Improvements

- **Worker Threads**: Offload CPU-intensive operations
- **Streaming**: Large data transfer optimization
- **Caching**: Enhanced intelligent caching strategies

### 12.2 Security Enhancements

- **Content Security Policy**: Stricter CSP implementation
- **Input Sanitization**: Enhanced message validation
- **Capability-based Security**: Limited privilege escalation

### 12.3 Cross-Platform Support

- **Web Extension**: Browser-based VS Code support
- **Remote Development**: SSH and container support
- **Mobile**: VS Code mobile compatibility

## Conclusion

The ModusToolbox Assistant architecture demonstrates a well-structured approach to VS Code extension development, combining the power of TypeScript backend processing with modern Angular frontend capabilities. The architecture prioritizes type safety, performance, and maintainability while providing a rich user experience for ModusToolbox development workflows.

The separation of concerns between frontend and backend, combined with a robust communication layer, enables independent development and testing of each component while ensuring reliable integration. The reactive programming patterns and comprehensive error handling provide a solid foundation for complex development tool functionality.