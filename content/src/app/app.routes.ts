import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: 'getting-started', 
    loadComponent: () => import('./getting-started/getting-started').then(m => m.GettingStarted)
  },
  { 
    path: 'development-kits', 
    loadComponent: () => import('./development-kits/development-kits').then(m => m.DevelopmentKits)
  },
  { 
    path: '', 
    redirectTo: '/getting-started', 
    pathMatch: 'full' 
  }
];
