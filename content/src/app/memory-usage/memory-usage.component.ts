import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PhysicalMemoryUsageData, MemoryRegion, MemoryUsageSegment } from '../../comms';

@Component({
  selector: 'app-memory-usage',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './memory-usage.component.html',
  styleUrls: ['./memory-usage.component.scss']
})
export class MemoryUsage {
  @Input() memoryUsageData: PhysicalMemoryUsageData[] | null = null ;
  @Input() collapsedStates: Map<string, boolean> = new Map();
  
  isMainSectionCollapsed = false;
  regionsCollapsedStates: Map<string, boolean> = new Map();

  formatHex(value: number): string {
    return '0x' + value.toString(16).toUpperCase().padStart(8, '0');
  }

  toggleMainSection(): void {
    this.isMainSectionCollapsed = !this.isMainSectionCollapsed;
  }

  toggleMemorySection(memoryName: string): void {
    const currentState = this.collapsedStates.get(memoryName) ?? false;
    this.collapsedStates.set(memoryName, !currentState);
  }

  isMemorySectionCollapsed(memoryName: string): boolean {
    return this.collapsedStates.get(memoryName) ?? false;
  }

  getRegionKey(memoryName: string, regionName: string): string {
    return `${memoryName}-${regionName}`;
  }

  toggleRegionCollapse(memoryName: string, regionName: string): void {
    const key = this.getRegionKey(memoryName, regionName);
    const currentState = this.regionsCollapsedStates.get(key) ?? true;
    this.regionsCollapsedStates.set(key, !currentState);
  }

  isRegionCollapsed(memoryName: string, regionName: string): boolean {
    const key = this.getRegionKey(memoryName, regionName);
    return this.regionsCollapsedStates.get(key) ?? true;
  }

  expandAll(): void {
    // Expand the main section
    this.isMainSectionCollapsed = false;
    
    // Expand all memory sections
    if (this.memoryUsageData) {
      this.memoryUsageData.forEach(memory => {
        this.collapsedStates.set(memory.name, false);
        
        // Expand all regions within each memory
        memory.regions.forEach(region => {
          const key = this.getRegionKey(memory.name, region.name);
          this.regionsCollapsedStates.set(key, false);
        });
      });
    }
  }

  collapseAll(): void {
    // Keep the main section expanded
    this.isMainSectionCollapsed = false;
    
    // Collapse all memory sections
    if (this.memoryUsageData) {
      this.memoryUsageData.forEach(memory => {
        this.collapsedStates.set(memory.name, true);
        
        // Collapse all regions within each memory
        memory.regions.forEach(region => {
          const key = this.getRegionKey(memory.name, region.name);
          this.regionsCollapsedStates.set(key, true);
        });
      });
    }
  }
}
