import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ApplicationStatusData, Documentation } from '../../comms';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'app-application-status',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule
  ],
  templateUrl: './application-status.html',
  styleUrls: ['./application-status.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ApplicationStatus implements OnInit {
  applicationStatus: ApplicationStatusData | null = null;
  isLoading = true;
  hasError = false;
  errorMessage = '';
  currentDate = new Date();

  constructor(private be: BackendService) {
    // Subscribe to app status data
    this.be.appStatusData.subscribe({
      next: (data) => {
        console.log('Application status data received:', data);
        this.applicationStatus = data;
        this.isLoading = false;
        this.hasError = false;
      },
      error: (error) => {
        console.error('Error loading application status:', error);
        this.hasError = true;
        this.errorMessage = 'Failed to load application status: ' + error.message;
        this.isLoading = false;
      }
    });
  }    

  ngOnInit(): void {
    // Request app status refresh
    try {
      this.be.appStatusMgr?.refreshAppStatus();
    } catch (error) {
      console.error('Error refreshing app status:', error);
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getMemoryColor(percentage: number): string {
    if (percentage < 50) return 'primary';
    if (percentage < 80) return 'accent';
    return 'warn';
  }

  getMemoryColorHex(percentage: number): string {
    if (percentage < 50) return '#28a745';
    if (percentage < 80) return '#ffc107';
    return '#dc3545';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'running':
      case 'active':
        return 'primary';
      case 'building':
      case 'inactive':
        return 'accent';
      case 'error':
      case 'stopped':
        return 'warn';
      default:
        return 'primary';
    }
  }

  getDocumentIcon(type: string): string {
    switch (type) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'html':
        return 'language';
      case 'markdown':
        return 'description';
      case 'text':
        return 'article';
      default:
        return 'insert_drive_file';
    }
  }

  getDocumentIconSymbol(type: string): string {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'html':
        return '🌐';
      case 'markdown':
        return '📝';
      case 'text':
        return '📋';
      default:
        return '📁';
    }
  }

  getMiddlewareIcon(status: string): string {
    switch (status) {
      case 'active':
        return 'check_circle';
      case 'inactive':
        return 'pause_circle';
      case 'error':
        return 'error';
      default:
        return 'help';
    }
  }

  getMiddlewareIconSymbol(status: string): string {
    switch (status) {
      case 'active':
        return '✅';
      case 'inactive':
        return '⏸️';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  }

  getToolIcon(type: string): string {
    switch (type) {
      case 'compiler':
        return '🔧';
      case 'debugger':
        return '🐛';
      case 'analyzer':
        return '🔍';
      case 'utility':
        return '⚙️';
      default:
        return '🛠️';
    }
  }

  getToolStatusColor(status: string): string {
    switch (status) {
      case 'available':
        return '#28a745';
      case 'missing':
        return '#dc3545';
      case 'outdated':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  }

  getProjectTypeIcon(type: string): string {
    switch (type) {
      case 'application':
        return '📱';
      case 'library':
        return '📚';
      case 'middleware':
        return '🔗';
      default:
        return '📦';
    }
  }

  openDocument(doc: Documentation): void {
    if (doc.url) {
      window.open(doc.url, '_blank');
    }
  }

  refresh(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.currentDate = new Date();
    
    try {
      this.be.appStatusMgr?.refreshAppStatus();
    } catch (error) {
      console.error('Error refreshing app status:', error);
      this.hasError = true;
      this.errorMessage = 'Failed to refresh application status';
      this.isLoading = false;
    }
  }
}

export default ApplicationStatus;
