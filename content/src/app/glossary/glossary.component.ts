import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlossaryEntry } from '../../comms';
import { BackendService } from '../backend/backend-service';



@Component({
  selector: 'app-glossary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './glossary.component.html',
  styleUrls: ['./glossary.component.scss']
})
export class GlossaryComponent {
  @Input() entries: GlossaryEntry[] = [];
  
  searchTerm = '';
  selectedLetter = 'A';
  alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  themeType: 'dark' | 'light' = 'light';
  
  constructor(private be: BackendService) {
    this.be.glossaryEntries.subscribe(entries => {
      this.addEntries(entries) ;
    }) ;
    
    // Subscribe to theme changes
    this.be.theme.subscribe(theme => {
      this.themeType = theme as 'dark' | 'light';
    });
  }

  // API method to add entries
  addEntries(newEntries: GlossaryEntry[]): void {
    this.entries = [...this.entries, ...newEntries];
    this.sortEntries();
  }

  // API method to add single entry
  addEntry(entry: GlossaryEntry): void {
    this.entries.push(entry);
    this.sortEntries();
  }

  // API method to clear all entries
  clearEntries(): void {
    this.entries = [];
  }

  private sortEntries(): void {
    this.entries.sort((a, b) => a.term.toLowerCase().localeCompare(b.term.toLowerCase()));
  }

  get filteredEntries(): GlossaryEntry[] {
    let filtered = this.entries;

    // Filter by search term
    if (this.searchTerm.trim()) {
      filtered = filtered.filter(entry => 
        entry.term.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        entry.definition.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      // Filter by selected letter if no search term
      filtered = filtered.filter(entry => 
        entry.term.toLowerCase().startsWith(this.selectedLetter.toLowerCase())
      );
    }

    return filtered;
  }

  selectLetter(letter: string): void {
    this.selectedLetter = letter;
    this.searchTerm = ''; // Clear search when selecting letter
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  hasEntriesForLetter(letter: string): boolean {
    return this.entries.some(entry => 
      entry.term.toLowerCase().startsWith(letter.toLowerCase())
    );
  }
}
