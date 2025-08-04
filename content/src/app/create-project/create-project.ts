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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BackendService } from '../backend/backend-service';
import { BSPIdentifier } from '../../comms';
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
        MatSnackBarModule,
        MatTooltipModule,
        MatSlideToggleModule,
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
    categories: string[] = [];
    bsps: BSPIdentifier[] = [];
    exampleCategories: string[] = [];
    examples: string[] = [];

    selectedCategory: string = '';
    selectedBSP: BSPIdentifier | null = null;
    selectedExampleCategory: string = '';
    selectedExample: string = '';

    constructor(
        private formBuilder: FormBuilder,
        private backendService: BackendService,
        private snackBar: MatSnackBar) {
                this.backendService.browserFolder.subscribe(folder => {
                    if (folder) {
                        this.projectInfoForm.patchValue({ projectLocation: folder });
                        this.snackBar.open('Directory selected successfully', 'Close', { duration: 2000 });
                    }
                }) ;
        }

    ngOnInit() {
        this.isDarkTheme = this.backendService.isDarkTheme;
        this.loadThemePreference();
        this.initializeForms();
        this.loadCategories();
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
        this.selectedExample = '';
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
        this.selectedExample = '';
        this.examples = [];

        try {
            this.isLoading = true;
            // Load examples for the selected BSP and category
            const allExamples = await this.backendService.manifestMgr.getExamplesForBSP(this.selectedBSP.id);
            this.examples = allExamples
                .filter(example => (example.category || 'General') === category)
                .map(example => example.name);
        } catch (error) {
            console.error('Failed to load examples:', error);
            this.snackBar.open('Failed to load examples for category', 'Close', { duration: 3000 });
        } finally {
            this.isLoading = false;
        }
    }

    onExampleChange() {
        this.selectedExample = this.exampleSelectionForm.get('example')?.value || '';
    }

    async createProject() {
        if (!this.projectInfoForm.valid || !this.bspSelectionForm.valid || !this.exampleSelectionForm.valid) {
            this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
            return;
        }

        const projectData = {
            name: this.projectInfoForm.value.projectName,
            location: this.projectInfoForm.value.projectLocation,
            category: this.selectedCategory,
            bsp: this.selectedBSP,
            exampleCategory: this.selectedExampleCategory,
            example: this.selectedExample,
            exampleid: this.selectedExample
        };

        try {
            this.isLoading = true;
            const success = await this.backendService.createProject(projectData);
            
            if (success) {
                this.snackBar.open('Project created successfully!', 'Close', { 
                    duration: 5000,
                    panelClass: ['success-snackbar']
                });
                this.resetForm();
            } else {
                throw new Error('Project creation failed');
            }
        } catch (error) {
            console.error('Failed to create project:', error);
            this.snackBar.open('Failed to create project. Please try again.', 'Close', { duration: 3000 });
        } finally {
            this.isLoading = false;
        }
    }

    resetForm() {
        this.projectInfoForm.reset();
        this.bspSelectionForm.reset();
        this.exampleSelectionForm.reset();
        this.selectedCategory = '';
        this.selectedBSP = null;
        this.selectedExampleCategory = '';
        this.selectedExample = '';
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

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        // Optionally save the theme preference to localStorage
        localStorage.setItem('createProject-theme', this.isDarkTheme ? 'dark' : 'light');
    }

    private loadThemePreference() {
        const savedTheme = localStorage.getItem('createProject-theme');
        if (savedTheme) {
            this.isDarkTheme = savedTheme === 'dark';
        }
    }
}

export default CreateProject;
