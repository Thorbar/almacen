import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';


@Component({
  selector: 'app-main-site',
  templateUrl: './main-site.component.html',
  styleUrls: ['./main-site.component.css']
})
export class MainSiteComponent {
  loading = false; // Añadido para manejar el estado de carga

  constructor(private auth: AngularFireAuth,
              private router: Router) { }
/*
  volver() {
    this.router.navigate(['/home']);
  }*/
  consultarBaseDatos() {
    this.router.navigate(['/stock-actual']);
  }
  comprobarArticulos() {
    this.router.navigate(['/articulos']);
  }
  listaCompra() {
    this.router.navigate(['/lista']);
  }

  async cerrarSesion() {
    // Muestra un cuadro de diálogo de confirmación
    const confirmar = window.confirm('¿Desea cerrar sesión?');

    if (confirmar) {
      this.loading = true; // Muestra el spinner

      try {
        await this.auth.signOut();
        this.router.navigate(['/login']);
      } catch (error) {
        // Verifica si el error es una instancia de Error
        if (error instanceof Error) {
          alert('Error al cerrar sesión: ' + error.message);
        } else {
          alert('Error al cerrar sesión: Un error desconocido ocurrió.');
        }
      } finally {
        this.loading = false; // Oculta el spinner
      }
    }
    // Si el usuario cancela, no hacer nada
  }
}