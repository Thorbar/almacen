import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main-site',
  templateUrl: './main-site.component.html',
  styleUrls: ['./main-site.component.css']
})
export class MainSiteComponent {
  constructor(private router: Router) { }

  volver() {
    this.router.navigate(['/home']);
  }
  consultarBaseDatos() {
    this.router.navigate(['/stock-actual']);
  }
  comprobarArticulos() {
    this.router.navigate(['/articulos']);
  }
  listaCompra() {
    this.router.navigate(['/lista']);
  }
}

