import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { BackendService } from '../backend/backend-service';
import { MemoryStats } from '../../comms';
import { CommonModule, DatePipe } from '@angular/common';
 
@Component({
  selector: 'app-app-view',
  standalone: true,
  imports: [CommonModule], // This includes DatePipe, NgIf, NgFor, etc.
  templateUrl: './app-view.html',
  styleUrls: ['./app-view.scss'],
})
export class AppView implements OnInit, OnDestroy {
  memoryStats$: Observable<MemoryStats | null>;
  private subscription?: Subscription;
  isLoading = true;
  error: string | null = null;

  constructor(private backend: BackendService) {
    this.memoryStats$ = this.backend.memoryStats;
  }

  ngOnInit(): void {
    this.subscription = this.memoryStats$.subscribe({
      next: (stats) => {
        this.isLoading = false;
        this.error = null;
      },
      error: (error) => {
        this.isLoading = false;
        this.error = 'Failed to load memory statistics';
        console.error('Memory stats error:', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  formatBytes(bytes: number): string {
    return this.backend.formatBytes(bytes);
  }

  getUsageLevel(percentage: number): string {
    return this.backend.getUsageLevel(percentage);
  }

  getUsageColor(percentage: number): string {
    const level = this.getUsageLevel(percentage);
    switch (level) {
      case 'low': return 'var(--success-color)';
      case 'medium': return 'var(--warning-color)';
      case 'high': return 'var(--danger-color)';
      case 'critical': return 'var(--critical-color)';
      default: return 'var(--primary-color)';
    }
  }

  getTotalUsagePercentage(stats: MemoryStats): number {
    return (stats.totalUsed / stats.totalAvailable) * 100;
  }

  refresh(): void {
    this.isLoading = true;
    this.error = null;
  }
}