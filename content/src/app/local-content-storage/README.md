# LocalContentStorage Component

A modern Angular component for managing BSP (Board Support Package) content in local storage with drag-and-drop functionality.

## Features

- **Dual List Interface**: Side-by-side lists showing "Not In Local Storage" and "In Local Storage"
- **Drag & Drop**: Move BSPs between lists with CDK drag-and-drop
- **Modern UI**: Material Design with sleek styling
- **Theme Support**: Both dark and light themes
- **Update Management**: Check for updates and start update processes
- **Responsive Design**: Fixed height lists that can hold at least 12 entries

## Usage

```typescript
import { LocalContentStorageComponent } from './local-content-storage/local-content-storage';

// Add to your routing
{ path: 'local-content-storage', component: LocalContentStorageComponent }
```

## Backend Integration

The component integrates with the BackendService and expects two new Subject streams:

- `bspsNotIn: Subject<string[]>` - BSPs not in local storage
- `bspsIn: Subject<string[]>` - BSPs in local storage

## API Calls

The component makes the following backend calls:

- `updateBSPStorage` - Start update process
- `checkBSPUpdates` - Check for available updates

## Styling

The component includes comprehensive styling for both light and dark themes:

- **Light Theme**: Clean white backgrounds with blue accents
- **Dark Theme**: Dark backgrounds with blue accents
- **Interactive Elements**: Hover effects and smooth transitions
- **Drag Indicators**: Visual feedback during drag operations

## Component Structure

```
LocalContentStorageComponent/
├── local-content-storage.ts      # Component logic
├── local-content-storage.html    # Template
└── local-content-storage.scss    # Styling
```

## Features in Detail

### Drag and Drop
- Uses Angular CDK drag-drop
- Visual feedback during dragging
- Smooth animations
- Connected drop lists

### Update Status
- Visual indicator for update availability
- Color-coded status (orange for available, green for current)
- Action buttons for checking and starting updates

### Theme Integration
- Automatically detects theme from BackendService
- Dynamic class binding for theme switching
- Consistent with application theme standards
