import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  showWelcome = true;
  title: any;

  constructor(
    private router: Router,
    private translate: TranslateService  
  ) {
    this.translate.setDefaultLang('es');
   }
}

