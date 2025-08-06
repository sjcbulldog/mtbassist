import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../backend/backend-service';
import { 
  ApplicationInfo, 
  ProjectInfo, 
  MemoryUsage, 
  Tool, 
  Document, 
  MiddlewareLibrary 
} from '../../comms';

@Component({
  selector: 'app-application-explorer',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    MatListModule,
    MatSlideToggleModule,
    FormsModule
  ],
  templateUrl: './application-explorer.html',
  styleUrl: './application-explorer.scss'
})
export class ApplicationExplorerComponent implements OnInit, OnDestroy {
  @Input() applicationInfo?: ApplicationInfo;
  
  isLoading = false;
  
  // Theme properties
  isDarkTheme: boolean = true;
  private readonly THEME_STORAGE_KEY = 'application-explorer-theme';
  
  // Panel states for collapsible sections
  applicationDocumentsExpanded = false;
  applicationToolsExpanded = false;
  
  // Track project panel states
  projectPanelStates: { [projectName: string]: { 
    documentsExpanded: boolean, 
    toolsExpanded: boolean,
    librariesExpanded: boolean 
  } } = {};

  constructor(private backendService: BackendService) {
    // Initialize theme from localStorage or backend service
    this.initializeTheme();
  }

  ngOnInit() {
    this.loadApplicationInfo();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  async loadApplicationInfo() {
    try {
      this.isLoading = true;
      // Load application info from backend service
      this.applicationInfo = await this.backendService.getApplicationInfo();
      
      // Initialize project panel states
      if (this.applicationInfo) {
        this.applicationInfo.projects.forEach(project => {
          this.projectPanelStates[project.name] = {
            documentsExpanded: false,
            toolsExpanded: false,
            librariesExpanded: false
          };
        });
      }
      
    } catch (error) {
      console.error('Failed to load application info:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Memory usage calculations
  getMemoryUsagePercentage(memory: MemoryUsage): number {
    return Math.round((memory.used / memory.size) * 100);
  }

  getMemoryUsageColor(percentage: number): string {
    if (percentage < 50) return 'primary';
    if (percentage < 80) return 'accent';
    return 'warn';
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Tool and document actions
  openDocument(document: Document) {
    console.log('Opening document:', document.title, document.url);
    // In a real implementation, this would open the document
    window.open(document.url, '_blank');
  }

  launchTool(tool: Tool) {
    console.log('Launching tool:', tool.name, tool.id);
    // In a real implementation, this would launch the tool via backend service
    this.backendService.platformSpecific('launchTool', { toolId: tool.id });
  }

  // Panel state management
  toggleApplicationDocuments() {
    this.applicationDocumentsExpanded = !this.applicationDocumentsExpanded;
  }

  toggleApplicationTools() {
    this.applicationToolsExpanded = !this.applicationToolsExpanded;
  }

  toggleProjectDocuments(projectName: string) {
    if (this.projectPanelStates[projectName]) {
      this.projectPanelStates[projectName].documentsExpanded = 
        !this.projectPanelStates[projectName].documentsExpanded;
    }
  }

  toggleProjectTools(projectName: string) {
    if (this.projectPanelStates[projectName]) {
      this.projectPanelStates[projectName].toolsExpanded = 
        !this.projectPanelStates[projectName].toolsExpanded;
    }
  }

  toggleProjectLibraries(projectName: string) {
    if (this.projectPanelStates[projectName]) {
      this.projectPanelStates[projectName].librariesExpanded = 
        !this.projectPanelStates[projectName].librariesExpanded;
    }
  }

  // Get panel state for templates
  isProjectDocumentsExpanded(projectName: string): boolean {
    return this.projectPanelStates[projectName]?.documentsExpanded || false;
  }

  isProjectToolsExpanded(projectName: string): boolean {
    return this.projectPanelStates[projectName]?.toolsExpanded || false;
  }

  isProjectLibrariesExpanded(projectName: string): boolean {
    return this.projectPanelStates[projectName]?.librariesExpanded || false;
  }

  // Utility methods for display
  getProjectGridColumns(): number {
    if (!this.applicationInfo?.projects) return 1;
    const projectCount = this.applicationInfo.projects.length;
    if (projectCount <= 2) return projectCount;
    if (projectCount <= 4) return 2;
    return 3; // Maximum 3 columns for better readability
  }

  refreshApplicationInfo() {
    this.loadApplicationInfo();
  }

  // Theme methods
  private initializeTheme() {
    // Try to get theme from localStorage first
    const savedTheme = localStorage.getItem(this.THEME_STORAGE_KEY);
    if (savedTheme !== null) {
      this.isDarkTheme = savedTheme === 'dark';
    } else {
      // Fall back to backend service theme
      this.isDarkTheme = this.backendService.isDarkTheme;
    }
    this.applyTheme();
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    this.saveThemePreference();
    this.applyTheme();
  }

  private saveThemePreference() {
    localStorage.setItem(this.THEME_STORAGE_KEY, this.isDarkTheme ? 'dark' : 'light');
  }

  private applyTheme() {
    const body = document.body;
    if (this.isDarkTheme) {
      body.classList.remove('light-theme');
      body.classList.add('dark-theme');
    } else {
      body.classList.remove('dark-theme');
      body.classList.add('light-theme');
    }
  }

  get currentThemeIcon(): string {
    return this.isDarkTheme ? 'light_mode' : 'dark_mode';
  }

  get currentThemeTooltip(): string {
    return this.isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme';
  }
}
