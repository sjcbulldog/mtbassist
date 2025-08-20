import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DevKitInfo } from '../../comms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'app-devkit-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, MatTooltipModule],
  templateUrl: './devkit-list.component.html',
  styleUrls: ['./devkit-list.component.scss']
})
export class DevkitListComponent {
  devkits: DevKitInfo[] = [];
  themeType: 'dark' | 'light' = 'light';

  constructor(private be: BackendService, private cdr: ChangeDetectorRef) {
    this.be.devKitStatus.subscribe({
      next: (data) => {
        this.be.log('Dev Kit status data received:') ;
        this.devkits = data ;
        this.cdr.detectChanges();
      }
    }) ;
    
    // Subscribe to theme changes
    this.be.theme.subscribe(theme => {
      this.themeType = theme as 'dark' | 'light';
    });
  }

  refreshDevKits() {
    this.be.sendRequestWithArgs('refreshDevKits', null) ;
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
