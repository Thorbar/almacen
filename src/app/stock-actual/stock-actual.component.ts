import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-stock-actual',
  templateUrl: './stock-actual.component.html',
  styleUrl: './stock-actual.component.css'
})
export class StockActualComponent {
  constructor(private router: Router) { }


  volver() {
    this.router.navigate(['/main-site']);
  }

}
