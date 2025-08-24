import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApplicationStatusData, Documentation } from '../../comms';
import { BackendService } from '../backend/backend-service';

@Component({
    selector: 'app-application-status',
    standalone: true,
    imports: [
        CommonModule,
        MatTabsModule,
        MatIconModule,
        MatTooltipModule
    ],
    templateUrl: './application-status.html',
    styleUrls: ['./application-status.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ApplicationStatus implements OnInit {
    intellisenseProject: string | null = null;

    applicationStatus: ApplicationStatusData | null = null;
    isLoading = true;
    hasError = false;
    errorMessage = '';
    currentDate = new Date();
    fixingAssetsProjects: Set<string> = new Set(); // Track which projects are currently fixing assets
    currentlyLoadingAsset: string = ''; // Track which asset is currently being loaded
    themeType: 'dark' | 'light' = 'light';
    
    // Collapsed states for project sections (projectName -> sectionName -> boolean)
    collapsedSections: Map<string, Map<string, boolean>> = new Map();

    constructor(private be: BackendService, private cdr: ChangeDetectorRef) {
        // Subscribe to app status data
        this.be.appStatusData.subscribe({
            next: (data) => {
                this.be.log('Application status data received:') ;
                this.applicationStatus = data;
                this.isLoading = false;
                this.hasError = false;
                this.fixingAssetsProjects.clear() ;

                // Start components section collapsed for each project
                if (data && data.projects) {
                    for (const project of data.projects) {
                        if (!this.collapsedSections.has(project.name)) {
                            this.collapsedSections.set(project.name, new Map());
                        }
                        this.collapsedSections.get(project.name)!.set('components', true);
                    }
                }

                this.cdr.detectChanges();
            },
            error: (error) => {
                console.error('Error loading application status:', error);
                this.hasError = true;
                this.errorMessage = 'Failed to load application status: ' + error.message;
                this.isLoading = false;
            }
        });

        // Subscribe to loaded asset updates
        this.be.loadedAsset.subscribe({
            next: (asset) => {
                this.currentlyLoadingAsset = asset;
            }
        });

        this.be.intellisenseProject.subscribe({
            next: (projectName) => {
                this.be.log(`ApplicationStatus: intellisense = ${projectName}`);
                this.setIntellisenseProject(projectName) ;
            }
        });
        
        // Subscribe to theme changes
        this.be.theme.subscribe(theme => {
            this.themeType = theme as 'dark' | 'light';
        });
    }

    // Called when Intellisense Project checkbox is changed
    onIntellisenseProjectChange(projectName: string): void {
        this.setIntellisenseProject(projectName);
        this.handleIntellisenseProjectChange(projectName);
    }

    // Public method to set the Intellisense Project checkbox for a given project name
    setIntellisenseProject(projectName: string): void {
        this.intellisenseProject = projectName;
        this.cdr.detectChanges() ;        
    }

    // Method to be called when Intellisense Project is set
    handleIntellisenseProjectChange(projectName: string): void {
        this.be.sendRequestWithArgs('setIntellisenseProject', { project: projectName });
    }

    viewReadme() {
        if (this.applicationStatus && this.applicationStatus.name) {
            // Assume the application directory is applicationStatus.name
            // and README.md is in that directory
            this.be.sendRequestWithArgs('openReadme', null);
        }
    }    

    // Called when a middleware tile is clicked in the project tab
    onMiddlewareClick(project: any, middleware: any): void {
        this.be.sendRequestWithArgs('libmgr', null) ;
    }

    onToolClick(project: any, tool: any): void {
        this.be.sendRequestWithArgs('tool', { tool: tool, project: project }) ;
    }

    ngOnInit(): void {
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

    // Check if a project has missing assets
    hasMissingAssets(project: any): boolean {
        return project.missingAssets || false ;
    }

    // Get missing assets details for a project
    getMissingAssetsDetails(project: any): string[] {
        return project.missingAssetDetails || [] ;
    }

    // Check if a specific middleware is missing
    isMiddlewareMissing(project: any, middlewareName: string): boolean {
        const missingAssets = this.getMissingAssetsDetails(project);
        return missingAssets.includes(middlewareName);
    }

    // Check if a project is currently fixing assets
    isFixingAssets(project: any): boolean {
        return this.fixingAssetsProjects.has(project.name);
    }

    // Get the currently loading asset display text
    getCurrentlyLoadingAsset(project: any): string {
        if (this.isFixingAssets(project) && this.currentlyLoadingAsset) {
            return this.currentlyLoadingAsset;
        }
        return '';
    }

    // Fix missing assets for a project
    fixMissingAssets(project: any): void {
        if (this.isFixingAssets(project)) {
            return; // Already fixing assets for this project
        }

        this.fixingAssetsProjects.add(project.name);
        this.currentlyLoadingAsset = ''; // Reset current asset

        try {
            this.be.fixMissingAssets(project);
        } catch (error) {
            console.error('Error fixing missing assets for project:', project.name, error);
            this.fixingAssetsProjects.delete(project.name);
            this.currentlyLoadingAsset = ''; // Clear current asset on error
        }
    }

    openDocument(doc: Documentation): void {
        this.be.sendRequestWithArgs('open', doc) ;
    }

    // Build Actions
    buildApplication(): void {
        this.be.executeBuildAction('build');
    }

    rebuildApplication(): void {
        this.be.executeBuildAction('rebuild');
    }

    cleanApplication(): void {
        this.be.executeBuildAction('clean');
    }

    eraseApplication(): void {
        this.be.executeBuildAction('erase');
    }

    programApplication(): void {
        this.be.executeBuildAction('program');
    }

    // Project-specific Build Actions
    buildProject(project: any): void {
        this.be.executeBuildAction('build', project.name);
    }

    rebuildProject(project: any): void {
        this.be.executeBuildAction('rebuild', project.name);
    }

    cleanProject(project: any): void {
        this.be.executeBuildAction('clean', project.name);
    }

    programProject(project: any): void {
        this.be.executeBuildAction('program', project.name);
    }

    // Collapsible section methods
    toggleSection(projectName: string, sectionName: string): void {
        if (!this.collapsedSections.has(projectName)) {
            this.collapsedSections.set(projectName, new Map());
        }
        const projectSections = this.collapsedSections.get(projectName)!;
        const currentState = projectSections.get(sectionName) || false;
        projectSections.set(sectionName, !currentState);
    }

    isSectionCollapsed(projectName: string, sectionName: string): boolean {
        const projectSections = this.collapsedSections.get(projectName);
        if (!projectSections) {
            return false; // Default to expanded
        }
        return projectSections.get(sectionName) || false;
    }

    // Open Device Configurator
    openDeviceConfigurator(): void {
        this.be.sendRequestWithArgs('devcfg', null);
    }

    // Open Library Manager
    openLibraryManager(): void {
        this.be.sendRequestWithArgs('libmgr', null);
    }
}

export default ApplicationStatus;
