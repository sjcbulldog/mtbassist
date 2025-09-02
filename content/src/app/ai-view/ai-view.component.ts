/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
    private ival: number = 0 ;

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

    private relocate() {
        let aiwid = document.getElementById('eptai-chat-container') ;
        if (aiwid) {
            this.be.log('    AI widget being relocated');
            if (this.myContainer?.nativeElement) {
                this.be.log('    AI widget relocated');
                this.myContainer.nativeElement.appendChild(aiwid);
                clearInterval(this.ival);
            }
        }
    }

    private initView() {
        if (this.myContainer) {
            let w = (window as any) ;
            w.eptAIConfig = { 
                accessToken: this.apiKey.access_token,
                defaultQuestions: ["What is ModusToolbox?"],
                fullWindow: false,
                botName: 'ModusToolbox AI',
                introText: 'Hello, I am ModusToolbox AI here to help',
                placeholderText: 'Type your question here...',
                darkMode: this.theme.indexOf('dark') !== -1,
                botImage: 'https://www.mewserver.org/images/bot.png',
                hideLogo: true
            };
        
            var script = document.createElement('script');
            script.src = 'https://assets.ept.ai/chat/v0/ept_chat_loader.bundle.js?v=1.0.0';
            script.async = false;

            let container ;
            try {
                container = this.myContainer.nativeElement;
                container.appendChild(script);
                this.ival = setInterval(this.relocate.bind(this), 10000);
            }
            catch(err) {
                this.be.log('    Error loading AI script: ' + err);
            }

        }
    }
}
