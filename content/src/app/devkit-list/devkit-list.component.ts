import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DevKitInfo } from '../../comms';
import { MatIconModule } from '@angular/material/icon';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'app-devkit-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './devkit-list.component.html',
  styleUrls: ['./devkit-list.component.scss']
})
export class DevkitListComponent {
  devkits: DevKitInfo[] = [];

  constructor(private be: BackendService, private cdr: ChangeDetectorRef) {
    this.be.devKitStatus.subscribe({
      next: (data) => {
        this.be.log('Dev Kit status data received:') ;
        this.devkits = data ;
        this.cdr.detectChanges();
      }
    }) ;
  }

  refreshDevKits() {
    this.be.sendRequestWithArgs('refreshDevKits', null) ;
  }

  updateFirmware(kit: DevKitInfo) {
    this.be.log(`Requesting firmware update for ${kit.name} (${kit.serial})`);
    this.be.sendRequestWithArgs('updateFirmware', kit);
  }
}
