import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { BackendService } from '../backend/backend-service';


@Component({
  selector: 'app-ai-view',
  standalone: true,
  template: `<div #aiAgentContainer></div>`
})
export class AIViewComponent implements AfterViewInit, OnInit {
    @ViewChild('aiAgentContainer') myContainer?: ElementRef<HTMLDivElement>;
    private apiKey: any ;
    private theme: string = 'dark' ;

    constructor(private be: BackendService) {
        this.be.log('AIViewComponent constructor called');
    }

    ngOnInit(): void {
        this.be.aiApiKey.subscribe((key) => {
            this.be.log('AI API key received');
            this.apiKey = key;
            this.initView() ;
        });        

        this.be.theme.subscribe((theme) => {
            this.be.log('Theme received');
            this.theme = theme;
        });
    }

    ngAfterViewInit() {
    }

    private initView() {
        this.be.log('AIViewComponent initialized');
        if (this.myContainer) {
            this.be.log('    Container found - loading AI script with key: ' + this.apiKey.access_token) ;
            let w = (window as any) ;
            w.eptAIConfig = { 
                accessToken: this.apiKey.access_token,
                defaultQuestions: ["What is ModusToolbox?"],
                fullWindow: true,
                botName: 'ModusToolbox AI',
                introText: 'Hello, I am ModusToolbox AI here to help',
                placeholderText: 'Type your question here...',
                darkMode: this.theme.indexOf('dark') !== -1,
                botImage: 'https://www.mewserver.org/images/bot.png',
                hideLogo: true
            };
        
            var script = document.createElement('script');
            script.src = 'https://assets.ept.ai/chat/v0/ept_chat_loader.bundle.js?v=1.0.0';
            script.async = true;

            try {
                let container = this.myContainer.nativeElement;
                container.appendChild(script);
                this.be.log('    AI script loaded successfully');
            }
            catch(err) {
                this.be.log('    Error loading AI script: ' + err);
            }
        }
    }
}
