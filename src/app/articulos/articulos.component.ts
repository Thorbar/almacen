import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-articulos',
  templateUrl: './articulos.component.html',
  styleUrl: './articulos.component.css'
})
export class ArticulosComponent {

  constructor(private router: Router) { }


  irASecot() {
    this.router.navigate(['/seco']);
  }

  irAFrescos() {
    this.router.navigate(['/frescos']);
  }

  irACongelado() {
    this.router.navigate(['/congelado']);
  }

  irALimpieza() {
    this.router.navigate(['/limpieza']);
  }
  volver() {
    this.router.navigate(['/main-site']);
  }
}
