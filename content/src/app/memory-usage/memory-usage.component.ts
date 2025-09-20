import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MemoryUsageData } from '../../comms';

@Component({
  selector: 'app-memory-usage',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './memory-usage.component.html',
  styleUrls: ['./memory-usage.component.scss']
})
export class MemoryUsage {
  @Input() memoryUsageData: MemoryUsageData[] | null = null ;
  @Input() collapsedStates: Map<string, boolean> = new Map();
  
  isMainSectionCollapsed = false;
  sectionsCollapsedStates: Map<string, boolean> = new Map();

  formatHex(value: number): string {
    return '0x' + value.toString(16).toUpperCase().padStart(8, '0');
  }

  toggleMainSection(): void {
    this.isMainSectionCollapsed = !this.isMainSectionCollapsed;
  }

  toggleMemorySection(memoryName: string): void {
    const currentState = this.collapsedStates.get(memoryName) || false;
    this.collapsedStates.set(memoryName, !currentState);
  }

  isMemorySectionCollapsed(memoryName: string): boolean {
    return this.collapsedStates.get(memoryName) || false;
  }

  getSegmentKey(memoryName: string, segmentStart: number): string {
    return `${memoryName}-${segmentStart}`;
  }

  toggleSectionsCollapse(memoryName: string, segmentStart: number): void {
    const key = this.getSegmentKey(memoryName, segmentStart);
    const currentState = this.sectionsCollapsedStates.get(key) || false;
    this.sectionsCollapsedStates.set(key, !currentState);
  }

  isSectionsCollapsed(memoryName: string, segmentStart: number): boolean {
    const key = this.getSegmentKey(memoryName, segmentStart);
    return this.sectionsCollapsedStates.get(key) || false;
  }

  shouldCollapseSections(sections: string[]): boolean {
    return sections.length > 10;
  }
}
