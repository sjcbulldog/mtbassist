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

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlossaryEntry } from '../../comms';
import { BackendService } from '../backend/backend-service';
import { Subscription } from 'rxjs/internal/Subscription';



@Component({
  selector: 'app-glossary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './glossary.component.html',
  styleUrls: ['./glossary.component.scss']
})
export class GlossaryComponent implements OnInit, OnDestroy {
  @Input() entries: GlossaryEntry[] = [];
  
  searchTerm = '';
  selectedLetter = 'A';
  alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  themeType: 'dark' | 'light' = 'light';

  private glossarySubscription?: Subscription;
  private themeSubscription?: Subscription;
  private readySubscription?: Subscription;

  constructor(private be: BackendService) {
  }

  ngOnInit(): void {
    this.glossarySubscription = this.be.glossaryEntries.subscribe(entries => {
      this.addEntries(entries);
    });

    this.themeSubscription = this.be.theme.subscribe(theme => {
      this.themeType = theme as 'dark' | 'light';
    });

    this.readySubscription = this.be.ready.subscribe(ready => {
      if (ready) {
        this.be.sendRequestWithArgs('glossary-data', null);
      }
    });
  }

  ngOnDestroy(): void {
    this.glossarySubscription?.unsubscribe();
    this.themeSubscription?.unsubscribe();
    this.readySubscription?.unsubscribe();
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
