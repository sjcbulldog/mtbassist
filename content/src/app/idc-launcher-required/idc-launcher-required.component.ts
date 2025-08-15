import { Component } from '@angular/core';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'idc-launcher-required',
  standalone: true,
  templateUrl: './idc-launcher-required.component.html',
  styleUrls: ['./idc-launcher-required.component.scss']
})
export class IdcLauncherRequiredComponent {
  isRetrying = false;
  
  constructor(private be: BackendService) {
  }
  
  onDownload() {
    this.be.sendRequestWithArgs('open', { location: 'https://softwaretools.infineon.com/assets/com.ifx.tb.launcher2' });
  }
  
  onRetry() {
    this.isRetrying = true;
    this.be.sendRequestWithArgs('restartExtension', null);   
  }
}
