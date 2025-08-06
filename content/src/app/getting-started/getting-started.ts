import { Component } from '@angular/core';
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
  constructor(private be: BackendService) {
    this.be.log('GettingStarted component initialized');
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
    this.be.platformSpecific('gettingStarted', null);
  }

  onViewDocumentation() {
    this.be.platformSpecific('documentation', null);
  }

  onCommunity() {
    this.be.platformSpecific('community', null);
  }

  onBrowseExamples() {
    this.be.platformSpecific('browseExamples', null);
  }

  onStepAction(step: any) {
    this.be.log(`Executing action for step ${step.step}: ${step.action}`);
    if (step.step === 1) {
      this.be.setNavTab(2) ; // Navigate to Create New Project tab (index 2)
    }
    else if (step.step === 2) {
      this.be.setNavTab(3) ; // Navigate to Application Explorer tab (index 1)
    }
  }
}
