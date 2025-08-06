import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';

export interface MemoryInfo {
  type: string;
  used: number;
  total: number;
  percentage: number;
}

export interface Documentation {
  name: string;
  type: 'pdf' | 'html' | 'markdown' | 'text';
  size: string;
  lastModified: Date;
  url?: string;
}

export interface Middleware {
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'error';
  description: string;
}

export interface Tool {
  name: string;
  version: string;
  type: 'compiler' | 'debugger' | 'analyzer' | 'utility';
  status: 'available' | 'missing' | 'outdated';
  description: string;
  path?: string;
}

export interface Project {
  id: string;
  name: string;
  version: string;
  type: 'application' | 'library' | 'middleware';
  status: 'active' | 'inactive' | 'building' | 'error';
  buildDate: Date;
  documentation: Documentation[];
  middleware: Middleware[];
  tools: Tool[];
}

export interface ApplicationStatusData {
  name: string;
  version: string;
  buildDate: Date;
  status: 'running' | 'stopped' | 'building' | 'error';
  memory: MemoryInfo[];
  documentation: Documentation[];
  middleware: Middleware[];
  projects: Project[];
}

@Component({
  selector: 'app-application-status',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule
  ],
  templateUrl: './application-status.html',
  styleUrls: ['./application-status.scss']
})
export class ApplicationStatus implements OnInit {
  applicationStatus: ApplicationStatusData | null = null;
  isLoading = true;

  constructor() {}

  ngOnInit(): void {
    this.loadApplicationStatus();
  }

  private loadApplicationStatus(): void {
    // Mock data - replace with actual service calls
    this.applicationStatus = {
      name: 'MTB Assistant Application',
      version: '2.1.0',
      buildDate: new Date('2025-08-06T10:30:00'),
      status: 'running',
      memory: [
        { type: 'SRAM', used: 45600, total: 65536, percentage: 69.6 },
        { type: 'RRAM', used: 128000, total: 262144, percentage: 48.8 },
        { type: 'SOCMEM', used: 32768, total: 65536, percentage: 50.0 },
        { type: 'DTCM', used: 16384, total: 32768, percentage: 50.0 },
        { type: 'ITCM', used: 24576, total: 32768, percentage: 75.0 },
        { type: 'XIP', used: 1048576, total: 2097152, percentage: 50.0 }
      ],
      documentation: [
        {
          name: 'User Manual',
          type: 'pdf',
          size: '2.4 MB',
          lastModified: new Date('2025-08-05T14:22:00'),
          url: '/docs/user-manual.pdf'
        },
        {
          name: 'API Reference',
          type: 'html',
          size: '1.8 MB',
          lastModified: new Date('2025-08-04T09:15:00'),
          url: '/docs/api-reference.html'
        },
        {
          name: 'Installation Guide',
          type: 'markdown',
          size: '156 KB',
          lastModified: new Date('2025-08-03T16:45:00'),
          url: '/docs/installation.md'
        },
        {
          name: 'Release Notes',
          type: 'text',
          size: '89 KB',
          lastModified: new Date('2025-08-06T08:30:00'),
          url: '/docs/release-notes.txt'
        }
      ],
      middleware: [
        {
          name: 'HTTP Server',
          version: '1.2.3',
          status: 'active',
          description: 'Web server for API endpoints'
        },
        {
          name: 'Database Connector',
          version: '2.0.1',
          status: 'active',
          description: 'Database connection middleware'
        },
        {
          name: 'Authentication',
          version: '1.5.0',
          status: 'active',
          description: 'User authentication and authorization'
        },
        {
          name: 'File Manager',
          version: '0.9.2',
          status: 'inactive',
          description: 'File upload and management system'
        },
        {
          name: 'Email Service',
          version: '1.1.0',
          status: 'error',
          description: 'SMTP email sending service'
        }
      ],
      projects: [
        {
          id: 'proj-001',
          name: 'Main Application',
          version: '1.0.0',
          type: 'application',
          status: 'active',
          buildDate: new Date('2025-08-06T09:00:00'),
          documentation: [
            {
              name: 'Project README',
              type: 'markdown',
              size: '45 KB',
              lastModified: new Date('2025-08-05T16:30:00'),
              url: '/projects/main/README.md'
            },
            {
              name: 'Architecture Guide',
              type: 'pdf',
              size: '1.2 MB',
              lastModified: new Date('2025-08-04T11:20:00'),
              url: '/projects/main/architecture.pdf'
            }
          ],
          middleware: [
            {
              name: 'HTTP Router',
              version: '2.1.0',
              status: 'active',
              description: 'Main application routing'
            },
            {
              name: 'Session Manager',
              version: '1.3.2',
              status: 'active',
              description: 'User session management'
            }
          ],
          tools: [
            {
              name: 'GCC Compiler',
              version: '11.2.0',
              type: 'compiler',
              status: 'available',
              description: 'GNU Compiler Collection',
              path: '/usr/bin/gcc'
            },
            {
              name: 'GDB Debugger',
              version: '10.1',
              type: 'debugger',
              status: 'available',
              description: 'GNU Debugger',
              path: '/usr/bin/gdb'
            }
          ]
        },
        {
          id: 'proj-002',
          name: 'Core Library',
          version: '2.3.1',
          type: 'library',
          status: 'active',
          buildDate: new Date('2025-08-05T14:15:00'),
          documentation: [
            {
              name: 'API Documentation',
              type: 'html',
              size: '890 KB',
              lastModified: new Date('2025-08-05T10:45:00'),
              url: '/projects/core/api-docs.html'
            }
          ],
          middleware: [
            {
              name: 'Data Validator',
              version: '1.0.5',
              status: 'active',
              description: 'Input data validation'
            }
          ],
          tools: [
            {
              name: 'Static Analyzer',
              version: '3.1.0',
              type: 'analyzer',
              status: 'available',
              description: 'Code quality analysis tool'
            },
            {
              name: 'Memory Profiler',
              version: '2.0.1',
              type: 'utility',
              status: 'outdated',
              description: 'Memory usage profiling'
            }
          ]
        },
        {
          id: 'proj-003',
          name: 'Communication Module',
          version: '1.1.5',
          type: 'middleware',
          status: 'building',
          buildDate: new Date('2025-08-06T08:30:00'),
          documentation: [
            {
              name: 'Protocol Specification',
              type: 'pdf',
              size: '2.1 MB',
              lastModified: new Date('2025-08-03T09:20:00'),
              url: '/projects/comm/protocol-spec.pdf'
            },
            {
              name: 'Integration Guide',
              type: 'markdown',
              size: '78 KB',
              lastModified: new Date('2025-08-06T07:45:00'),
              url: '/projects/comm/integration.md'
            }
          ],
          middleware: [
            {
              name: 'Message Queue',
              version: '3.2.1',
              status: 'active',
              description: 'Inter-process communication'
            },
            {
              name: 'Protocol Handler',
              version: '1.4.0',
              status: 'inactive',
              description: 'Communication protocol processing'
            }
          ],
          tools: [
            {
              name: 'Protocol Debugger',
              version: '1.5.2',
              type: 'debugger',
              status: 'available',
              description: 'Communication protocol debugging'
            },
            {
              name: 'Network Analyzer',
              version: '4.0.0',
              type: 'analyzer',
              status: 'missing',
              description: 'Network traffic analysis'
            }
          ]
        }
      ]
    };

    // Simulate loading delay
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getMemoryColor(percentage: number): string {
    if (percentage < 50) return 'primary';
    if (percentage < 80) return 'accent';
    return 'warn';
  }

  getMemoryColorHex(percentage: number): string {
    if (percentage < 50) return '#28a745';
    if (percentage < 80) return '#ffc107';
    return '#dc3545';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'running':
      case 'active':
        return 'primary';
      case 'building':
      case 'inactive':
        return 'accent';
      case 'error':
      case 'stopped':
        return 'warn';
      default:
        return 'primary';
    }
  }

  getDocumentIcon(type: string): string {
    switch (type) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'html':
        return 'language';
      case 'markdown':
        return 'description';
      case 'text':
        return 'article';
      default:
        return 'insert_drive_file';
    }
  }

  getDocumentIconSymbol(type: string): string {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'html':
        return '🌐';
      case 'markdown':
        return '📝';
      case 'text':
        return '📋';
      default:
        return '📁';
    }
  }

  getMiddlewareIcon(status: string): string {
    switch (status) {
      case 'active':
        return 'check_circle';
      case 'inactive':
        return 'pause_circle';
      case 'error':
        return 'error';
      default:
        return 'help';
    }
  }

  getMiddlewareIconSymbol(status: string): string {
    switch (status) {
      case 'active':
        return '✅';
      case 'inactive':
        return '⏸️';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  }

  getToolIcon(type: string): string {
    switch (type) {
      case 'compiler':
        return '🔧';
      case 'debugger':
        return '🐛';
      case 'analyzer':
        return '🔍';
      case 'utility':
        return '⚙️';
      default:
        return '🛠️';
    }
  }

  getToolStatusColor(status: string): string {
    switch (status) {
      case 'available':
        return '#28a745';
      case 'missing':
        return '#dc3545';
      case 'outdated':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  }

  getProjectTypeIcon(type: string): string {
    switch (type) {
      case 'application':
        return '📱';
      case 'library':
        return '📚';
      case 'middleware':
        return '🔗';
      default:
        return '📦';
    }
  }

  openDocument(doc: Documentation): void {
    if (doc.url) {
      window.open(doc.url, '_blank');
    }
  }

  refresh(): void {
    this.isLoading = true;
    this.loadApplicationStatus();
  }
}

export default ApplicationStatus;
