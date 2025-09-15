import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Subscription } from 'rxjs';
import { BackendService } from '../backend/backend-service';
import { ThemeType } from '../../comms';

@Component({
  selector: 'app-llvm-installer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './llvm-installer.component.html',
  styleUrls: ['./llvm-installer.component.scss']
})
export class LlvmInstallerComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();

  installerForm: FormGroup;
  llvmVersions: string[] = [];
  loadingVersions = false;
  isInstalling = false;
  installProgressMessage = '';
  themeType: ThemeType = 'light';

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private backendService: BackendService
  ) {
    this.installerForm = this.fb.group({
      installPath: ['', [Validators.required, this.validatePath.bind(this)]],
      version: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.subscriptions.push(
      this.backendService.theme.subscribe(theme => {
        this.themeType = theme;
      })
    );

    // Subscribe to LLVM versions
    this.subscriptions.push(
      this.backendService.llvmVersions.subscribe(versions => {
        this.llvmVersions = versions;
        this.loadingVersions = false;
      })
    );

    // Subscribe to folder browser results
    this.subscriptions.push(
      this.backendService.browserFolder.subscribe(result => {
        if (result && result.path) {
          this.installerForm.patchValue({ installPath: result.path });
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private validatePath(control: any) {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }

    const path = control.value;

    // Check for spaces
    if (path.includes(' ')) {
      return { hasSpaces: true };
    }

    // Check for invalid characters - only allow ASCII printable characters that are valid in paths
    const validPathRegex = /^[a-zA-Z0-9\-_\\:/.]+$/;
    if (!validPathRegex.test(path)) {
      return { invalidCharacters: true };
    }

    return null;
  }

  browseForInstallDirectory(): void {
    this.backendService.sendRequestWithArgs('browseForFolder', {
      title: 'Select LLVM Installation Directory',
      defaultPath: 'C:\\Program Files'
    });
  }

  installLLVM(): void {
    if (this.installerForm.valid && !this.isInstalling) {
      this.isInstalling = true;
      this.installProgressMessage = 'Preparing installation...';

      const installData = {
        installPath: this.installerForm.value.installPath,
        version: this.installerForm.value.version
      };

      this.backendService.sendRequestWithArgs('install-llvm', installData);

      // Subscribe to installation progress if available
      this.subscriptions.push(
        this.backendService.progressMessage.subscribe(message => {
          if (message) {
            this.installProgressMessage = message;
          }
        })
      );
    }
  }

  onCloseInstaller(): void {
    if (!this.isInstalling) {
      this.close.emit();
    }
  }
}