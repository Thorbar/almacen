import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  showWelcome = true;

  constructor(private router: Router) { }

  irAlSupermercado() {
    this.showWelcome = false;
    this.router.navigate(['/main-site']);
  }
}

