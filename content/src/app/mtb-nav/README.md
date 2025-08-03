# MtbNav Component

The `mtb-nav` component is a reusable Angular Material-based tab navigation component that encapsulates mat-tab-group functionality.

## Features

- **Icon Support**: Add Material Design icons to tab labels
- **Configurable Background**: Support for primary, accent, and warn themes
- **Flexible Alignment**: Start, center, or end alignment for tabs
- **Responsive Design**: Optimized for mobile and desktop
- **Tab State Management**: Handle tab selection and disabled states
- **Placeholder Content**: Built-in placeholder for tabs under development

## Interface

```typescript
export interface MtbNavTab {
  label: string;        // Tab display label
  component: any;       // Component identifier (string or class)
  disabled?: boolean;   // Optional: disable tab
  icon?: string;        // Optional: Material Design icon name
}
```

## Usage

### Basic Setup

```typescript
// In your component
import { MtbNav, MtbNavTab } from './mtb-nav/mtb-nav';

@Component({
  imports: [MtbNav],
  // ...
})
export class MyComponent {
  navigationTabs: MtbNavTab[] = [
    {
      label: 'Home',
      component: 'HomeComponent',
      icon: 'home'
    },
    {
      label: 'Settings',
      component: 'SettingsComponent',
      icon: 'settings',
      disabled: false
    }
  ];
}
```

### Template Usage

```html
<mtb-nav 
  [tabs]="navigationTabs"
  backgroundColor="primary"
  alignment="center"
  [selectedIndex]="0">
</mtb-nav>
```

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tabs` | `MtbNavTab[]` | `[]` | Array of tab configurations |
| `backgroundColor` | `'primary' \| 'accent' \| 'warn'` | `'primary'` | Material theme color |
| `alignment` | `'start' \| 'center' \| 'end'` | `'center'` | Tab alignment |
| `selectedIndex` | `number` | `0` | Initially selected tab index |

## Events

- `onTabChange(index: number)`: Triggered when tab selection changes

## Extending the Component

To add new components to the navigation:

1. Import the component in `mtb-nav.ts`
2. Add the component to the imports array
3. Update the template switch statement to handle the new component
4. Add the tab configuration to your navigation array

## Example: Adding Multiple Components

```typescript
// mtb-nav.ts - Add imports
import { HomeComponent } from '../home/home';
import { SettingsComponent } from '../settings/settings';

@Component({
  imports: [
    // ... existing imports
    HomeComponent,
    SettingsComponent
  ]
})

// Update template switch cases as needed
```

## Responsive Behavior

- **Desktop**: Full icons and labels
- **Tablet**: Icons with labels
- **Mobile**: Labels only (icons hidden on very small screens)

## Customization

The component supports full Material Design theming and can be customized through:

- CSS custom properties
- Angular Material theme customization
- Component-level SCSS overrides
