import { Routes } from '@angular/router';
import { GettingStarted } from './getting-started/getting-started';
import { LocalContentStorageComponent } from './local-content-storage/local-content-storage';

export const routes: Routes = [
    { path: 'getting-started', component: GettingStarted },
    { path: 'local-content-storage', component: LocalContentStorageComponent }
];
