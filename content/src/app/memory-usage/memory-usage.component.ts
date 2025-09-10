import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MemoryUsageData } from '../../comms';

@Component({
  selector: 'app-memory-usage',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './memory-usage.component.html',
  styleUrls: ['./memory-usage.component.scss']
})
export class MemoryUsage {
  @Input() memoryUsageData: MemoryUsageData[] = [];
  @Input() collapsedStates: Map<string, boolean> = new Map();
  
  isMainSectionCollapsed = false;

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
}
