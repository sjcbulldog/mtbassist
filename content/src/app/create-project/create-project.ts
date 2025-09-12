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

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BackendService } from '../backend/backend-service';
import { BSPIdentifier, CodeExampleIdentifier, DevKitInfo, ThemeType } from '../../comms';
import { MatDivider } from "@angular/material/divider";
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-create-project',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatStepperModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        MatProgressBarModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatDivider
    ],
    templateUrl: './create-project.html',
    styleUrl: './create-project.scss'
})
export class CreateProject implements OnInit, OnDestroy {
    @ViewChild('stepActionsSection') stepActionsSectionRef?: ElementRef<HTMLDivElement>;
    @ViewChild('progressSection') progressSectionRef?: ElementRef<HTMLDivElement>;
    projectInfoForm!: FormGroup;
    bspSelectionForm!: FormGroup;
    exampleSelectionForm!: FormGroup;
    isLoading = false;
    themeType: ThemeType = 'light' ;
    projectCreated = false;
    projectPath = '';
    defaultProjectPath = '';
    progressValue = 0;
    progressMessage = 'Initializing project...';
    progressInterval?: number;

    selectedCategory: string = '';
    selectedBSP: BSPIdentifier | null = null;
    selectedExampleCategory: string = '';
    selectedExample: CodeExampleIdentifier | null = null;
    hoveredExample: CodeExampleIdentifier | null = null;
    hoveredBSP: BSPIdentifier | null = null;

    activeBSPs: BSPIdentifier[] = [];
    examples: CodeExampleIdentifier[] = [];
    allexamples: CodeExampleIdentifier[] = [];
    allBSPs: BSPIdentifier[] = [];

    // Dev kit integration
    devKits: DevKitInfo[] = [];
    selectedDevKit: DevKitInfo | null = null;
    manifestStatus: 'loading' | 'loaded' | 'not-available' = 'loading';

    private subscriptions: Subscription[] = [];

    constructor(private formBuilder: FormBuilder, private be: BackendService, private cdr: ChangeDetectorRef, private snackBar: MatSnackBar) {
    }

    ngOnInit() {
        this.be.log('CreateProject component initialized');
        this.initializeForms();

        this.subscriptions.push(this.be.ready.subscribe((ready) => {
            this.be.log(`CreateProject Component: ready: '${ready}'`, 'debug');
            this.be.sendRequestWithArgs('cproj-data', null);
            this.be.sendRequestWithArgs('kit-data', null);
        }));

        this.subscriptions.push(this.be.manifestStatus.subscribe(status => {
            this.be.log(`CreateProject Component: manifestStatus: '${status}'`, 'debug');   
            this.manifestStatus = status ;
            
            // Enable/disable form controls based on manifest status
            if (status === 'loaded') {
                this.projectInfoForm.get('projectName')?.enable();
                this.projectInfoForm.get('projectLocation')?.enable();
                // Ask for the BSPs and kits again as the manifest is loaded and we have
                // more information
                this.be.sendRequestWithArgs('cproj-data', null);
                this.be.sendRequestWithArgs('kit-data', null);
            } else {
                this.projectInfoForm.get('projectName')?.disable();
                this.projectInfoForm.get('projectLocation')?.disable();
            }
            
            this.cdr.detectChanges();
        }));

        this.subscriptions.push(this.be.browserFolder.subscribe(folder => {
            if (folder && folder.tag === 'create-project') {
                this.be.log(`CreateProject Component: browserFolder: '${folder.path}'`, 'debug');
                this.projectInfoForm.patchValue({ projectLocation: folder.path });
            }
        }));

        this.subscriptions.push(this.be.defaultProjectDir.subscribe(path => {
            this.be.log(`CreateProject Component: defaultProjectDir: '${path}'`, 'debug');             
            this.defaultProjectPath = path ;
            this.projectInfoForm.patchValue({ projectLocation: this.defaultProjectPath });  
        })) ;

        this.subscriptions.push(this.be.theme.subscribe(theme => {
            this.be.log(`CreateProject Component: theme: '${theme}'`, 'debug'); 
            this.themeType = theme;
            this.cdr.detectChanges() ;
        }));

        this.subscriptions.push(this.be.devKitStatus.subscribe(kits => {
            this.be.log(`CreateProject Component: devKitStatus: ${kits.length} kits detected`, 'debug');
            this.devKits = kits;
        }));

        this.subscriptions.push(this.be.allBSPs.subscribe(bsps => {
            this.be.log(`CreateProject Component: allBSPs: '${bsps.length} BSPs'`, 'debug');
            this.allBSPs = bsps;
        })); 

        this.subscriptions.push(this.be.activeBSPs.subscribe(bsps => {
            this.be.log(`CreateProject Component: activeBSPs: '${bsps.length} BSPS'`, 'debug');
            this.activeBSPs = bsps;
        }));

        this.subscriptions.push(this.be.codeExample.subscribe(examples => {
            this.be.log(`CreateProject Component: codeExamples: '${examples.length} Examples'`, 'debug');
            this.allexamples = examples;
        }));

        this.subscriptions.push(this.be.progressMessage.subscribe(message => {
            this.progressMessage = message || '' ;
        }));    

        this.subscriptions.push(this.be.progressPercent.subscribe(percent => {
            this.progressValue = percent || 0 ;
        }));
    }

    ngOnDestroy(): void {
        this.be.log('CreateProject component destroyed');
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    public refreshKits() {
        this.be.sendRequestWithArgs('kit-data', null) ;
    }
    
    // Only show dev kits with a non-empty, non-'unknown' name
    public get filteredDevKits(): DevKitInfo[] {
        return this.devKits.filter(kit => kit.bsp);
    }

    // Called when a dev kit is selected from the UI
    onDevKitSelect(kit: DevKitInfo) {
        this.selectedDevKit = kit;
        this.be.log(`Dev Kit Selected: ${JSON.stringify(kit)}`, 'debug') ;

        let found = false;
        for(let bsp of this.allBSPs) {
            if (bsp.name === kit.bsp) {
                this.be.log(`Dev Kit Selected: ${JSON.stringify(kit)}`, 'debug') ;
                this.bspSelectionForm.patchValue({ category: bsp.category});
                this.selectedCategory = bsp.category;
                this.onCategoryChange();
                found = true ;
                break;
            }
        }

        if (!found) {
            let cats : string[] = [] ;
            for(let bsp of this.allBSPs) {
                this.be.log(`Checking BSP ${bsp.name} starts with dev kit ${kit.name}`) ;
                if (bsp.name.startsWith(kit.name)) {
                    cats.push(bsp.category);
                }
            }
            if (cats.length === 1) {
                this.bspSelectionForm.patchValue({ category: cats[0], bsp: '' });
                this.selectedCategory = cats[0];
                this.selectedBSP = null;
                this.onCategoryChange();    
            }
        }
    }

    private initializeForms() {
        this.projectInfoForm = this.formBuilder.group({
            projectName: [{value: '', disabled: true}, [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/), this.noSpacesValidator]],
            projectLocation: [{value: '', disabled: true}, [Validators.required, this.noSpacesValidator]]
        });

        this.bspSelectionForm = this.formBuilder.group({
            category: ['', Validators.required],
            bsp: ['', Validators.required]
        });

        this.exampleSelectionForm = this.formBuilder.group({
            exampleCategory: ['', Validators.required],
            example: ['', Validators.required]
        });
    }

    // Custom validator to check for spaces
    private noSpacesValidator(control: any) {
        if (control.value && control.value.includes(' ')) {
            return { hasSpaces: true };
        }
        return null;
    }

    async browseForDirectory() {
        this.be.browseForFolder('create-project', 'Select Project Location') ;
    }

    async onCategoryChange() {
        const category = this.bspSelectionForm.get('category')?.value;
        if (!category) return;

        this.selectedCategory = category;
        this.bspSelectionForm.patchValue({ bsp: '' });
        this.selectedBSP = null;
        this.examples = [];
        this.exampleSelectionForm.patchValue({ example: '' });

        // If a dev kit is selected, try to auto-select its BSP if it matches the category
        if (this.selectedDevKit) {
            let bsp = this.activeBSPs.find(bsp => bsp.name === this.selectedDevKit?.bsp && bsp.category === category);
            if (bsp) {
                this.selectedBSP = bsp;
                this.bspSelectionForm.patchValue({ category: this.selectedCategory, bsp: bsp.id });
                this.onBSPChange();
            }
        }
    }

    async onBSPChange() {
        const bspId = this.bspSelectionForm.get('bsp')?.value;
        if (!bspId) return;

        this.selectedBSP = this.activeBSPs.find(bsp => bsp.id === bspId) || null;
        this.exampleSelectionForm.patchValue({ exampleCategory: '', example: '' });
        this.selectedExampleCategory = '';
        this.selectedExample = null;
        this.examples = [];

        try {
            this.isLoading = true;
            this.be.sendRequestWithArgs('getCodeExamples', this.selectedBSP) ;
        } catch (error) {
            this.snackBar.open('Failed to load example categories for BSP', 'Close', { duration: 3000 });
        } finally {
            this.isLoading = false;
        }
    }

    async onExampleCategoryChange() {
        const category = this.exampleSelectionForm.get('exampleCategory')?.value;
        if (!category || !this.selectedBSP) return;

        this.selectedExampleCategory = category;
        this.exampleSelectionForm.patchValue({ example: '' });
        this.selectedExample = null;
        this.examples = [];

        try {
            this.isLoading = true;
            // Load examples for the selected BSP and category
            this.examples = this.allexamples.filter(example => example.category === category).sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            this.snackBar.open('Failed to load examples for category', 'Close', { duration: 3000 });
        } finally {
            this.isLoading = false;
        }
    }

    onExampleChange() {
        const exampleValue = this.exampleSelectionForm.get('example')?.value;
        this.selectedExample = this.examples.find(example => example.id === exampleValue) || null;
    }

    onExampleHover(example: CodeExampleIdentifier) {
        this.hoveredExample = example;
    }

    onExampleLeave() {
        this.hoveredExample = null;
    }

    onBSPHover(bsp: BSPIdentifier) {
        this.hoveredBSP = bsp;
    }

    onBSPLeave() {
        this.hoveredBSP = null;
    }

    async createProject() {
        if (!this.projectInfoForm.valid || !this.bspSelectionForm.valid || !this.exampleSelectionForm.valid) {
            this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
            return;
        }

        const projectData = {
            name: this.projectInfoForm.value.projectName,
            location: this.projectInfoForm.value.projectLocation,
            bsp: this.selectedBSP,
            example: this.selectedExample,
        };

        try {
            this.isLoading = true;

            // Scroll to the progress bar after a short delay to ensure it is rendered
            setTimeout(() => {
                if (this.progressSectionRef && this.progressSectionRef.nativeElement) {
                    this.progressSectionRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            }, 100);
            
            const success = await this.be.createProject(projectData);
            
            if (success) {
                this.projectCreated = true;
                this.projectPath = this.getProjectPath();
                this.snackBar.open('Project created successfully!', 'Close', { 
                    duration: 5000,
                    panelClass: ['success-snackbar']
                });
            } else {
                throw new Error('Project creation failed');
            }
        } catch (error) {
            console.error('Failed to create project:', error);
            this.snackBar.open('Failed to create project. Please try again.', 'Close', { duration: 3000 });
        } finally {
            this.clearProgress();
            this.isLoading = false;
        }
    }

    private startProgressSimulation() {
        this.progressValue = 0;
        this.progressMessage = 'Initializing project...';

        this.be.progressMessage.subscribe(message => {
            if (message) {
                this.progressMessage = message;
            }
            else {
                this.progressMessage = '' ;
            }
        });

        this.be.progressPercent.subscribe(percent => {
            if (percent) {
                this.progressValue = percent;
            }
            else {
                this.progressValue = 0;
            }
        });
    }
    
    private clearProgress() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = undefined;
        }
    }

    async loadProject() {
        this.snackBar.open(`Loading project from: ${this.projectPath}`, 'Close', { duration: 3000 });
        this.be.log(`Loading workspace ${JSON.stringify(this.exampleSelectionForm.value)}`);
        await this.be.loadWorkspace(this.projectInfoForm.value.projectLocation, this.projectInfoForm.value.projectName, this.exampleSelectionForm.value.example) ;
    }

    resetForm() {
        this.projectInfoForm.reset();
        this.bspSelectionForm.reset();
        this.exampleSelectionForm.reset();
        this.selectedCategory = '';
        this.selectedBSP = null;
        this.selectedExampleCategory = '';
        this.selectedExample = null;
        this.hoveredExample = null;
        this.hoveredBSP = null;
        this.projectCreated = false;
        this.projectPath = '';
        this.clearProgress();
        this.progressValue = 0;
        this.progressMessage = 'Initializing project...';
        this.activeBSPs = [];
        this.examples = [];
    }

    getProjectPath(): string {
        const location = this.projectInfoForm.value.projectLocation;
        const name = this.projectInfoForm.value.projectName;
        if (location && name) {
            return `${location}/${name}`;
        }
        return '';
    }

    getBSPCategories() : string[] {
        const catset = new Set(this.activeBSPs.map(bsp => bsp.category));
        return [...catset];
    }

    getExampleCategories() : string[] {
        let exset = new Set(this.allexamples.map(ex => ex.category))
        return [...exset] ;
    }

    public getBSPsForSelectedCategory(): BSPIdentifier[] {
        if (!this.selectedCategory) return [];
        return this.activeBSPs.filter(bsp => bsp.category === this.selectedCategory);
    }
}

export default CreateProject;
