# Create Project Component

The `create-project` component provides a step-by-step wizard for creating new ModusToolbox projects.

## Features

- **Multi-step Wizard**: Guided project creation process using Angular Material Stepper
- **Directory Browser**: Integration with backend to browse and select project location
- **BSP Selection**: Dynamic loading of Board Support Package categories and options
- **Example Selection**: Choose from available code examples for the selected BSP
- **Form Validation**: Comprehensive validation with user-friendly error messages
- **Progress Indicators**: Loading states and progress feedback
- **Responsive Design**: Optimized for desktop and mobile devices

## Workflow

### Step 1: Project Information
- **Project Name**: User enters a valid project name (alphanumeric, hyphens, underscores)
- **Project Location**: Browse for directory or manually enter path
- **Path Preview**: Shows the full project path that will be created

### Step 2: BSP Selection
- **Category Selection**: Choose from available BSP categories (e.g., Wireless, MCU, Sensors)
- **BSP Selection**: Select specific Board Support Package within the category
- **Device Information**: Display device type and connectivity options

### Step 3: Example Selection
- **Code Examples**: Choose from available examples for the selected BSP
- **Dynamic Loading**: Examples are loaded based on the selected BSP

### Step 4: Review & Create
- **Summary Review**: Display all selected options for confirmation
- **Project Creation**: Execute the project creation process
- **Success Feedback**: Confirmation and next steps

## Backend Integration

The component integrates with the backend service for:

```typescript
// Directory browsing
await backendService.openDirectoryPicker()

// BSP data retrieval
await backendService.getBSPCategories()
await backendService.getBSPsForCategory(category)

// Example code retrieval
await backendService.getExamplesForBSP(bspId)

// Project creation
await backendService.createProject(projectData)
```

## Data Structures

### Project Data
```typescript
interface ProjectData {
  name: string;
  location: string;
  category: string;
  bsp: DevKitIdentifier;
  example: string;
}
```

### DevKit Identifier
```typescript
interface DevKitIdentifier {
  name: string;
  id: string;
  device: string;
  connectivity: string;
  category: string;
}
```

## Navigation Integration

- Accessible via the "Create New Project" tab in the main navigation
- Can be launched from the Getting Started component's quick actions
- Uses the backend service's `setNavTab()` method for programmatic navigation

## Error Handling

- Form validation with real-time feedback
- Network error handling with user notifications
- Fallback data for development/testing scenarios
- Loading states to prevent user confusion

## Responsive Behavior

- **Desktop**: Full multi-column layout with side-by-side forms
- **Tablet**: Responsive form fields with adequate spacing
- **Mobile**: Single-column layout with stacked browse button

## Development Notes

- Uses mock data for development when backend is unavailable
- Comprehensive TypeScript typing for type safety
- Material Design components for consistent UI
- Reactive forms for robust validation and state management

## Future Enhancements

- Project templates and advanced configuration
- Git repository initialization
- Workspace integration
- Build configuration options
- Custom BSP support
