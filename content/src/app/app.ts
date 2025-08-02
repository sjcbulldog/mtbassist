import { Component, ViewChild } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { GettingStarted } from './getting-started/getting-started';
import { DevelopmentKits } from './development-kits/development-kits';

@Component({
  selector: 'app-root',
  imports: [MatTabsModule, GettingStarted, DevelopmentKits],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  @ViewChild('toptab') toptap: any;
}
