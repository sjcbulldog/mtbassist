import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { BackendService } from '../backend/backend-service';

@Component({
  selector: 'app-initializing',
  standalone: true,
  imports: [],
  templateUrl: './initializing.component.html',
  styleUrl: './initializing.component.scss'
})
export class InitializingComponent implements OnInit, OnDestroy {
  themeType: 'dark' | 'light' = 'dark';
  private themeSubscription?: Subscription;

  constructor(private backendService: BackendService) {}

  ngOnInit() {
    this.themeSubscription = this.backendService.theme.subscribe(theme => {
      this.themeType = theme as 'dark' | 'light';
    });
  }

  ngOnDestroy() {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }
}
