import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { BackendService } from '../backend-service';
import { interval, Subscription } from 'rxjs';

interface DevKitInfo {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  status: 'connected' | 'disconnected' | 'updating' | 'error';
  connectionType: 'USB' | 'Ethernet' | 'Wireless';
  firmwareVersion: string;
  latestFirmwareVersion: string;
  needsUpdate: boolean;
  batteryLevel?: number;
  temperature?: number;
  lastSeen: Date;
  capabilities: string[];
  port?: string;
  updateProgress?: number;
}

interface FirmwareUpdateInfo {
  version: string;
  releaseDate: Date;
  size: string;
  changelog: string[];
  isRequired: boolean;
}

@Component({
  selector: 'app-development-kits',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatListModule,
    MatDividerModule,
    MatBadgeModule
  ],
  templateUrl: './development-kits.html',
  styleUrl: './development-kits.scss'
})
export class DevelopmentKits implements OnInit, OnDestroy {
  devKits: DevKitInfo[] = [];
  isScanning = false;
  lastScanTime: Date | null = null;
  scanSubscription?: Subscription;
  refreshSubscription?: Subscription;

  // Mock data for demonstration
  mockDevKits: DevKitInfo[] = [
    {
      id: 'kit-001',
      name: 'PSoC 6 WiFi-BT Pioneer Kit',
      model: 'CY8CKIT-062-WIFI-BT',
      serialNumber: 'PSoC6-001234',
      status: 'connected',
      connectionType: 'USB',
      firmwareVersion: '2.4.0',
      latestFirmwareVersion: '2.5.1',
      needsUpdate: true,
      batteryLevel: 85,
      temperature: 42,
      lastSeen: new Date(),
      capabilities: ['WiFi', 'Bluetooth', 'CapSense', 'GPIO'],
      port: 'COM3'
    },
    {
      id: 'kit-002',
      name: 'PSoC 6 Secure MCU',
      model: 'CY8CKIT-062S2-43012',
      serialNumber: 'PSoC6S-005678',
      status: 'connected',
      connectionType: 'USB',
      firmwareVersion: '1.8.2',
      latestFirmwareVersion: '1.8.2',
      needsUpdate: false,
      temperature: 38,
      lastSeen: new Date(),
      capabilities: ['Security', 'WiFi', 'Crypto', 'TrustZone'],
      port: 'COM5'
    },
    {
      id: 'kit-003',
      name: 'PSoC 4 Development Kit',
      model: 'CY8CKIT-149',
      serialNumber: 'PSoC4-009876',
      status: 'updating',
      connectionType: 'USB',
      firmwareVersion: '1.2.1',
      latestFirmwareVersion: '1.3.0',
      needsUpdate: true,
      updateProgress: 65,
      lastSeen: new Date(),
      capabilities: ['CapSense', 'LCD', 'GPIO'],
      port: 'COM7'
    },
    {
      id: 'kit-004',
      name: 'XMC4700 Relax Kit',
      model: 'KIT_XMC47_RELAX_V1',
      serialNumber: 'XMC47-112233',
      status: 'disconnected',
      connectionType: 'USB',
      firmwareVersion: '3.1.0',
      latestFirmwareVersion: '3.2.1',
      needsUpdate: true,
      lastSeen: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      capabilities: ['Ethernet', 'CAN', 'Motor Control'],
      port: 'COM12'
    }
  ];

  constructor(
    private backendService: BackendService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.scanForDevKits();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.scanSubscription?.unsubscribe();
    this.refreshSubscription?.unsubscribe();
  }

  scanForDevKits() {
    this.isScanning = true;
    
    // Simulate scanning process
    setTimeout(() => {
      this.devKits = [...this.mockDevKits];
      this.lastScanTime = new Date();
      this.isScanning = false;
      this.snackBar.open(`Found ${this.devKits.length} development kit(s)`, 'Close', { duration: 3000 });
    }, 2000);
  }

  startAutoRefresh() {
    // Auto-refresh every 30 seconds
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.refreshDevKitStatus();
    });
  }

  refreshDevKitStatus() {
    // Simulate status updates
    this.devKits.forEach(kit => {
      if (kit.status === 'updating' && kit.updateProgress !== undefined) {
        kit.updateProgress += Math.random() * 10;
        if (kit.updateProgress >= 100) {
          kit.updateProgress = undefined;
          kit.status = 'connected';
          kit.firmwareVersion = kit.latestFirmwareVersion;
          kit.needsUpdate = false;
          this.snackBar.open(`${kit.name} firmware update completed!`, 'Close', { 
            duration: 5000,
            panelClass: ['success-snackbar']
          });
        }
      }
      
      // Simulate temperature changes
      if (kit.temperature) {
        kit.temperature += (Math.random() - 0.5) * 2;
        kit.temperature = Math.max(30, Math.min(60, kit.temperature));
      }
      
      // Simulate battery level changes
      if (kit.batteryLevel) {
        kit.batteryLevel = Math.max(0, kit.batteryLevel - Math.random() * 0.5);
      }
    });
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'connected': return 'check_circle';
      case 'disconnected': return 'cancel';
      case 'updating': return 'update';
      case 'error': return 'error';
      default: return 'help_outline';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'connected': return '#4CAF50';
      case 'disconnected': return '#9E9E9E';
      case 'updating': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#666';
    }
  }

  getConnectionIcon(type: string): string {
    switch (type) {
      case 'USB': return 'usb';
      case 'Ethernet': return 'ethernet';
      case 'Wireless': return 'wifi';
      default: return 'cable';
    }
  }

  getBatteryIcon(level?: number): string {
    if (!level) return 'battery_unknown';
    if (level > 90) return 'battery_full';
    if (level > 60) return 'battery_6_bar';
    if (level > 30) return 'battery_3_bar';
    if (level > 10) return 'battery_1_bar';
    return 'battery_0_bar';
  }

  getBatteryColor(level?: number): string {
    if (!level) return '#666';
    if (level > 30) return '#4CAF50';
    if (level > 10) return '#FF9800';
    return '#F44336';
  }

  getTemperatureColor(temp?: number): string {
    if (!temp) return '#666';
    if (temp > 50) return '#F44336';
    if (temp > 40) return '#FF9800';
    return '#4CAF50';
  }

  startFirmwareUpdate(devKit: DevKitInfo) {
    if (devKit.status === 'updating') {
      this.snackBar.open('Firmware update already in progress', 'Close', { duration: 3000 });
      return;
    }

    if (devKit.status !== 'connected') {
      this.snackBar.open('Device must be connected to update firmware', 'Close', { duration: 3000 });
      return;
    }

    // Start firmware update
    devKit.status = 'updating';
    devKit.updateProgress = 0;
    
    this.snackBar.open(`Starting firmware update for ${devKit.name}...`, 'Close', { duration: 3000 });
  }

  cancelFirmwareUpdate(devKit: DevKitInfo) {
    if (devKit.status !== 'updating') return;
    
    devKit.status = 'connected';
    devKit.updateProgress = undefined;
    
    this.snackBar.open(`Firmware update cancelled for ${devKit.name}`, 'Close', { duration: 3000 });
  }

  viewDevKitDetails(devKit: DevKitInfo) {
    // Show detailed information about the dev kit
    this.snackBar.open(`Viewing details for ${devKit.name}`, 'Close', { duration: 2000 });
  }

  connectToDevKit(devKit: DevKitInfo) {
    if (devKit.status === 'connected') return;
    
    devKit.status = 'connected';
    devKit.lastSeen = new Date();
    
    this.snackBar.open(`Connected to ${devKit.name}`, 'Close', { duration: 3000 });
  }

  disconnectFromDevKit(devKit: DevKitInfo) {
    if (devKit.status === 'disconnected') return;
    
    if (devKit.status === 'updating') {
      this.snackBar.open('Cannot disconnect during firmware update', 'Close', { duration: 3000 });
      return;
    }
    
    devKit.status = 'disconnected';
    devKit.lastSeen = new Date();
    
    this.snackBar.open(`Disconnected from ${devKit.name}`, 'Close', { duration: 3000 });
  }

  getFirmwareUpdateInfo(devKit: DevKitInfo): FirmwareUpdateInfo {
    return {
      version: devKit.latestFirmwareVersion,
      releaseDate: new Date(),
      size: '2.4 MB',
      changelog: [
        'Improved WiFi connectivity stability',
        'Enhanced security features',
        'Bug fixes and performance improvements',
        'Updated USB driver compatibility'
      ],
      isRequired: devKit.needsUpdate && devKit.firmwareVersion < '2.0.0'
    };
  }

  getConnectedCount(): number {
    return this.devKits.filter(kit => kit.status === 'connected').length;
  }

  getUpdatingCount(): number {
    return this.devKits.filter(kit => kit.status === 'updating').length;
  }

  getNeedsUpdateCount(): number {
    return this.devKits.filter(kit => kit.needsUpdate).length;
  }

  formatLastSeen(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }
}
