/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { ApplicationStatusData, Documentation } from '../../comms';
import { BackendService } from '../backend/backend-service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-application-status',
    standalone: true,
    imports: [
        CommonModule,
        MatTabsModule,
        MatIconModule,
        MatTooltipModule,
        MatButtonModule
    ],
    templateUrl: './application-status.html',
    styleUrls: ['./application-status.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ApplicationStatus implements OnInit, OnDestroy {
    intellisenseProject: string | null = null;

    applicationStatus: ApplicationStatusData | null = null;
    isLoading = true;
    hasError = false;
    running = false ;

    errorMessage = '';
    currentDate = new Date();
    fixingAssetsProjects: Set<string> = new Set(); // Track which projects are currently fixing assets
    currentlyLoadingAsset: string = ''; // Track which asset is currently being loaded
    themeType: 'dark' | 'light' = 'light';
    
    // Collapsed states for project sections (projectName -> sectionName -> boolean)
    collapsedSections: Map<string, Map<string, boolean>> = new Map();

    private subscriptions: Subscription[] = [] ;

    constructor(private be: BackendService, private cdr: ChangeDetectorRef) {
        // Subscribe to app status data
    }

    ngOnInit() : void {

        this.subscriptions.push(this.be.ready.subscribe((ready) => {
            if (ready) {
                this.be.sendRequestWithArgs('app-data', null) ;
            }
        }));

        this.subscriptions.push(this.be.appStatusData.subscribe({
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
        }));

        // Subscribe to loaded asset updates
        this.subscriptions.push(this.be.loadedAsset.subscribe({
            next: (asset) => {
                if (asset) {
                    this.currentlyLoadingAsset = asset;
                }   
            }
        }));

        this.subscriptions.push(this.be.intellisenseProject.subscribe({
            next: (projectName) => {
                this.be.log(`ApplicationStatus: intellisense = ${projectName}`);
                this.setIntellisenseProject(projectName) ;
            }
        }));
        
        // Subscribe to theme changes
        this.subscriptions.push(this.be.theme.subscribe(theme => {
            this.themeType = theme as 'dark' | 'light';
        }));

        this.subscriptions.push(this.be.buildDone.subscribe((done) => {
            this.running = !done;
        }));
    }

    ngOnDestroy(): void {
        this.be.log('ApplicationStatus ngOnDestroy');
        this.subscriptions.forEach(sub => sub.unsubscribe());
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
        this.running = true;
        this.be.executeBuildAction('build');
    }

    rebuildApplication(): void {
        this.running = true;
        this.be.executeBuildAction('rebuild');
    }

    cleanApplication(): void {
        this.running = true;
        this.be.executeBuildAction('clean');
    }

    eraseApplication(): void {
        this.running = true;
        this.be.executeBuildAction('erase');
    }

    programApplication(): void {
        this.running = true;
        this.be.executeBuildAction('program');
    }

    // Project-specific Build Actions
    buildProject(project: any): void {
        this.running = true;
        this.be.executeBuildAction('build', project.name);
    }

    rebuildProject(project: any): void {
        this.running = true;
        this.be.executeBuildAction('rebuild', project.name);
    }

    cleanProject(project: any): void {
        this.running = true;
        this.be.executeBuildAction('clean', project.name);
    }

    programProject(project: any): void {
        this.running = true;
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

    fixTasks() {
        this.be.sendRequestWithArgs('fix-tasks', null);
    }
}

export default ApplicationStatus;
