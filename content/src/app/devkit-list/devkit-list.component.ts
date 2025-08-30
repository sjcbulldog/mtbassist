import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DevKitInfo } from '../../comms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BackendService } from '../backend/backend-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-devkit-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, MatTooltipModule],
  templateUrl: './devkit-list.component.html',
  styleUrls: ['./devkit-list.component.scss']
})
export class DevkitListComponent implements OnInit, OnDestroy {
  devkits: DevKitInfo[] = [];
  themeType: 'dark' | 'light' = 'light';

  private devKitStatusSubscription?: Subscription;
  private themeSubscription?: Subscription;
  private readySubscription?: Subscription ;

  constructor(private be: BackendService, private cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.be.log('DevkitListComponent initialized');

    this.readySubscription = this.be.ready.subscribe((ready) => {
      if (ready) {
        this.be.sendRequestWithArgs('kit-data', null);
      }
    });

    this.devKitStatusSubscription = this.be.devKitStatus.subscribe({
      next: (data) => {
        this.be.log('Dev Kit status data received:') ;
        this.devkits = data ;
        this.cdr.detectChanges();
      }
    }) ;
    
    // Subscribe to theme changes
    this.themeSubscription = this.be.theme.subscribe(theme => {
      this.themeType = theme as 'dark' | 'light';
    });    
  }

  ngOnDestroy(): void {
    this.be.log('DevkitListComponent destroyed');
    this.devKitStatusSubscription?.unsubscribe();
    this.themeSubscription?.unsubscribe();
  }

  refreshDevKits() {
    this.be.sendRequestWithArgs('kit-data', null) ;
  }

  updateFirmware(kit: DevKitInfo) {
    this.be.log(`Requesting firmware update for ${kit.name} (${kit.serial})`);
    this.be.sendRequestWithArgs('updateFirmware', kit);
  }

  onBspChange(kit: DevKitInfo, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const selectedBsp = selectElement.value;
    this.be.log(`BSP changed for kit ${kit.name} (${kit.serial}): ${selectedBsp}`);
    // You can add additional logic here to handle the BSP change
    // For example, send a request to the backend to update the kit's BSP
    this.be.sendRequestWithArgs('updateDevKitBsp', { kit, bsp: selectedBsp });
  }
}
