
import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { BSPIdentifier, CodeExampleIdentifier, DevKitInfo } from '../../comms';
import { MatDivider } from "@angular/material/divider";

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
    projectInfoForm!: FormGroup;
    bspSelectionForm!: FormGroup;
    exampleSelectionForm!: FormGroup;

    isLoading = false;
    isDarkTheme = true; // Default to dark theme
    projectCreated = false;
    projectPath = '';
    progressValue = 0;
    progressMessage = 'Initializing project...';
    private progressInterval?: number;
    categories: string[] = [];
    bsps: BSPIdentifier[] = [];
    exampleCategories: string[] = [];
    examples: CodeExampleIdentifier[] = [];
    allBSPs: BSPIdentifier[] = [];

    selectedCategory: string = '';
    selectedBSP: BSPIdentifier | null = null;
    selectedExampleCategory: string = '';
    selectedExample: CodeExampleIdentifier | null = null;
    hoveredExample: CodeExampleIdentifier | null = null;
    hoveredBSP: BSPIdentifier | null = null;

    // Dev kit integration
    devKits: DevKitInfo[] = [];
    selectedDevKit: DevKitInfo | null = null;

    // Only show dev kits with a non-empty, non-'unknown' name
    public get filteredDevKits(): DevKitInfo[] {
        return this.devKits.filter(kit => kit.name && kit.name.trim() !== '' && kit.name.toLowerCase() !== 'unknown');
    }

    constructor(
        private formBuilder: FormBuilder,
        public backendService: BackendService,
        private snackBar: MatSnackBar) {
            this.backendService.browserFolder.subscribe(folder => {
                if (folder) {
                    this.projectInfoForm.patchValue({ projectLocation: folder });
                    this.snackBar.open('Directory selected successfully', 'Close', { duration: 2000 });
                }
            }) ;

            // Subscribe to dev kit status
            this.backendService.devKitStatus.subscribe(kits => {
                this.devKits = kits;
            });

            this.backendService.allBSPs.subscribe(bsps => {
                this.allBSPs = bsps;
            }); 
        }

    ngOnInit() {
        this.isDarkTheme = this.backendService.isDarkTheme;
        this.initializeForms();
        this.loadCategories();
        // Initial dev kit fetch (if needed)
        this.backendService.platformSpecific?.('refreshDevKits', null);
    }
    
    private mapDevKitName(kitname: string) : string {
        if (kitname === 'KIT_PSOCE84_EVK') {
            return 'KIT_PSE84_EVAL_EPC2' ;
        }

        return kitname ;
    }

    private findBSPById(id: string): BSPIdentifier | null {
        return this.allBSPs.find(bsp => bsp.id === id) || null;
    }

    // Called when a dev kit is selected from the UI
    onDevKitSelect(kit: DevKitInfo) {
        this.selectedDevKit = kit;
        this.backendService.log(`Dev Kit Selected: ${JSON.stringify(kit)}`, 'debug') ;

        let found = false;
        let kname = this.mapDevKitName(kit.name);
        this.backendService.log(`Mapped Dev Kit Name: '${kname}'`, 'debug') ;             
        for(let bsp of this.allBSPs) {
            this.backendService.log(`    Checking BSP ${bsp.name} against mapped name ${kname}`, 'debug') ;
            if (bsp.name === kname) {     
                this.backendService.log(`Dev Kit Selected: ${JSON.stringify(kit)}`, 'debug') ;                
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
                this.backendService.log(`Checking BSP ${bsp.name} starts with dev kit ${kit.name}`) ;
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

    ngOnDestroy() {
        // Cleanup if needed
    }

    private initializeForms() {
        this.projectInfoForm = this.formBuilder.group({
            projectName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
            projectLocation: ['', Validators.required]
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

    private async loadCategories() {
        try {
            this.isLoading = true;
            this.categories = await this.backendService.manifestMgr.getBSPCategories();
        } catch (error) {
            console.error('Failed to load categories:', error);
            this.snackBar.open('Failed to load BSP categories', 'Close', { duration: 3000 });
        } finally {
            this.isLoading = false;
        }
    }

    async browseForDirectory() {
        this.backendService.log('Opening directory picker');
        this.backendService.browseForFolder();
    }

    async onCategoryChange() {
        const category = this.bspSelectionForm.get('category')?.value;
        if (!category) return;

        this.selectedCategory = category;
        this.bspSelectionForm.patchValue({ bsp: '' });
        this.selectedBSP = null;
        this.examples = [];
        this.exampleSelectionForm.patchValue({ example: '' });

        try {
            this.isLoading = true;
            this.bsps = await this.backendService.manifestMgr.getBSPsForCategory(category);

            if (this.selectedDevKit) {
                let kname = this.mapDevKitName(this.selectedDevKit.name);
                let bsp = this.findBSPById(kname) ;
                if (bsp) {
                    this.backendService.log(`Selected dev kit: ${this.selectedDevKit}`);
                    this.selectedBSP = bsp;
                    this.bspSelectionForm.patchValue({ category: this.selectedCategory, bsp: bsp.id });
                    this.onBSPChange() ;
                }
            }
        } catch (error) {
            console.error('Failed to load BSPs:', error);
            this.snackBar.open('Failed to load BSPs for category', 'Close', { duration: 3000 });
        } finally {
            this.isLoading = false;
        }
    }

    async onBSPChange() {
        const bspId = this.bspSelectionForm.get('bsp')?.value;
        if (!bspId) return;

        this.selectedBSP = this.bsps.find(bsp => bsp.id === bspId) || null;
        this.exampleSelectionForm.patchValue({ exampleCategory: '', example: '' });
        this.selectedExampleCategory = '';
        this.selectedExample = null;
        this.exampleCategories = [];
        this.examples = [];

        try {
            this.isLoading = true;
            // Load all examples for the BSP and extract unique categories
            const allExamples = await this.backendService.manifestMgr.getExamplesForBSP(bspId);
            this.exampleCategories = [...new Set(allExamples.map(example => example.category || 'General'))].sort();
        } catch (error) {
            console.error('Failed to load example categories:', error);
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
            const allExamples = await this.backendService.manifestMgr.getExamplesForBSP(this.selectedBSP.id);
            this.examples = allExamples
                .filter(example => (example.category || 'General') === category);
        } catch (error) {
            console.error('Failed to load examples:', error);
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
            this.startProgressSimulation();
            
            const success = await this.backendService.createProject(projectData);
            
            if (success) {
                this.projectCreated = true;
                this.projectPath = this.getProjectPath();
                this.snackBar.open('Project created successfully!', 'Close', { 
                    duration: 5000,
                    panelClass: ['success-snackbar']
                });
                // Don't reset form anymore, keep the data for reference
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

        this.backendService.progressMessage.subscribe(message => {
            this.progressMessage = message;
        });

        this.backendService.progressPercent.subscribe(percent => {
            this.progressValue = percent;
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
        this.backendService.log(`Loading workspace ${JSON.stringify(this.exampleSelectionForm.value)}`);
        await this.backendService.loadWorkspace(this.projectInfoForm.value.projectLocation, this.projectInfoForm.value.projectName, this.exampleSelectionForm.value.example) ;
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
        this.bsps = [];
        this.exampleCategories = [];
        this.examples = [];
    }

    getProjectPath(): string {
        const location = this.projectInfoForm.value.projectLocation;
        const name = this.projectInfoForm.value.projectName;
        if (location && name) {
            return `${location}\\${name}`;
        }
        return '';
    }
}

export default CreateProject;
