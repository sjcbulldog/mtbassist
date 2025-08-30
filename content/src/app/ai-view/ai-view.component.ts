import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BackendService } from '../backend/backend-service';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-ai-view',
  standalone: true,
  template: `<div #aiAgentContainer></div>`
})
export class AIViewComponent implements OnInit , OnDestroy {
    @ViewChild('aiAgentContainer') myContainer?: ElementRef<HTMLDivElement>;
    private apiKey: any ;
    private theme: string = 'dark' ;

    private apiKeySubscription?: Subscription;
    private themeSubscription?: Subscription;
    private readySubscription?: Subscription;

    constructor(private be: BackendService) {
        this.be.log('AIViewComponent constructor called');
    }

    ngOnInit(): void {
        this.apiKeySubscription = this.be.aiApiKey.subscribe((key) => {
            this.apiKey = key;
            if (this.apiKey.error) {
                this.initError() ;
            }
            else {
                this.initView() ;
            }
        });        

        this.themeSubscription = this.be.theme.subscribe((theme) => {
            this.be.log('AIViewComponent: theme received');
            this.theme = theme;
        });

        this.be.ready.subscribe(() => {
            this.be.log('AIViewComponent: backend ready');
            this.be.sendRequestWithArgs('ai-data', null) ;
        });
    }

    ngOnDestroy(): void {
        this.be.log('AIViewComponent ngOnDestroy');
        if (this.apiKeySubscription) {
            this.apiKeySubscription.unsubscribe();
        }

        if (this.themeSubscription) {
            this.themeSubscription.unsubscribe();
        }

        if (this.readySubscription) {
            this.readySubscription.unsubscribe();
        }
    }

    private initError() {
        if (this.myContainer) {
            let container = this.myContainer.nativeElement;
            let span = document.createElement("span") as HTMLSpanElement;
            span.innerText = `ModusToolbox AI Error: ${this.apiKey.error_description}` 
            container.appendChild(span);
        }
    }

    private initView() {
        if (this.myContainer) {
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
            }
            catch(err) {
                this.be.log('    Error loading AI script: ' + err);
            }
        }
    }
}
