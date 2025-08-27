import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { BackendService } from '../backend/backend-service';


@Component({
  selector: 'app-ai-view',
  standalone: true,
  template: `<div #container></div>`
})
export class AIViewComponent implements AfterViewInit {
    @ViewChild('container') myContainer?: ElementRef<HTMLDivElement>;
    private apiKey: any ;

    constructor(private be: BackendService) {
        be.aiApiKey.subscribe((key) => {
            this.apiKey = key;
            this.initView() ;
        });
    }

    ngAfterViewInit() {
        
    }

    private initView() {
        if (this.myContainer) {
            let w = (window as any) ;
            w.eptAIConfig = { 
                accessToken: this.apiKey.access_token,
            };
        
            var script = document.createElement('script');
            script.src = 'https://assets.ept.ai/chat/v0/ept_chat_loader.bundle.js?v=1.0.0';
            script.async = true;

            let container = this.myContainer.nativeElement;
            container.appendChild(script);
        }
    }
}
