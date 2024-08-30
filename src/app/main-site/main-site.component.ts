import { Component, ViewChild  } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import { AlertComponent } from '../alert/alert.component';



@Component({
  selector: 'app-main-site',
  templateUrl: './main-site.component.html',
  styleUrls: ['./main-site.component.css']
})
export class MainSiteComponent {
  loading = false; // Añadido para manejar el estado de carga
  selectedLanguage: string = 'es'; // Declara la propiedad aquí
  alertType: 'info' | 'error' = 'info'; // Añadido 'warning'


  constructor(
    private auth: AngularFireAuth,    
    private router: Router,
    private translate: TranslateService
    )  {
      const savedLanguage = localStorage.getItem('selectedLanguage');
      this.selectedLanguage = savedLanguage || 'es';
      this.translate.setDefaultLang(this.selectedLanguage);
      this.translate.use(this.selectedLanguage);
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

  async cerrarSesion() {
    // Obtiene el texto traducido
    const confirmMessage = this.translate.instant('CONFIRM_LOGOUT');
    //this.alertComponent.showAlerts(confirmMessage, 'confirm');    

    const confirmButtonText = this.translate.instant('YES');
    const cancelButtonText = this.translate.instant('NO');
    //alert(confirmMessage);

    const result = await Swal.fire({
      title: confirmMessage,
      showCancelButton: true,
      confirmButtonText: confirmButtonText,
      cancelButtonText: cancelButtonText,
      icon: 'warning'
    });

    if (result.isConfirmed) {
      this.loading = true;

      try {
        await this.auth.signOut();
        this.router.navigate(['']);
      } catch (error) {
        const errorMessage = error instanceof Error
          ? this.translate.instant('LOGOUT_ERROR', { error: error.message })
          : this.translate.instant('UNKNOWN_LOGOUT_ERROR');

        Swal.fire('Error', errorMessage, 'error');
      } finally {
        this.loading = false;
      }
    }
  }
}
