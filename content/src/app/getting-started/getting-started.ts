import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { BackendService } from '../backend/backend-service';
import MtbNav from '../mtb-nav/mtb-nav';

@Component({
  selector: 'app-getting-started',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatListModule,
    MatDividerModule
  ],
  templateUrl: './getting-started.html',
  styleUrl: './getting-started.scss'
})
export class GettingStarted {
  themeType: 'dark' | 'light' = 'dark'; // Default to light theme

  constructor(private be: BackendService, private cdr: ChangeDetectorRef) {
    this.be.theme.subscribe(theme => {
      if (theme === 'dark' || theme === 'light') {
        this.themeType = theme;
      }
      else {
        this.themeType = 'dark' ;
      }
      this.cdr.detectChanges() ;
    }) ;
  }

  goToCreateProject() {
    this.be.navTab?.next(1); // 1 = Create Project tab index
  }

  goToRecentlyOpened() {
    this.be.navTab?.next(2); // 2 = Recently Opened tab index (adjust if needed)
  }
  features = [
    {
      icon: 'speed',
      title: 'Quick Project Setup',
      description: 'Create new ModusToolbox projects with pre-configured templates and BSPs'
    },
    {
      icon: 'extension',
      title: 'Dev Kit Support',
      description: 'Support for various Infineon development kits and boards'
    },
    {
      icon: 'build',
      title: 'Build Integration',
      description: 'Seamless integration with VS Code build and debug workflows'
    },
    {
      icon: 'library_books',
      title: 'Code Examples',
      description: 'Access to extensive library of code examples and middleware'
    }
  ];

  quickStartSteps = [
    {
      step: 1,
      title: 'Create New Application',
      description: 'Use the new application wizard to create your first application',
      action: 'Create Project'
    },
    {
      step: 2,
      title: 'View in Application Explorer',
      description: 'View your application in the application explorer to build, debug, and manage your project',
      action: 'View Application Explorer'
    }
  ];

  onGetStarted() {
    this.be.sendRequestWithArgs('gettingStarted', null);
  }

  onViewDocumentation() {
    this.be.sendRequestWithArgs('documentation', null);
  }

  onCommunity() {
    this.be.sendRequestWithArgs('community', null);
  }

  onBrowseExamples() {
    this.be.sendRequestWithArgs('browseExamples', null);
  }

  onAddSoftware() {
    this.be.sendRequestWithArgs('runSetupProgram', null);
  }
}
