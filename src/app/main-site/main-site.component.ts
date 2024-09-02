import { Component, ViewChild  } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { TranslateService } from '@ngx-translate/core';
import { AlertComponent } from '../alert/alert.component';
import { Subscription } from 'rxjs';



@Component({
  selector: 'app-main-site',
  templateUrl: './main-site.component.html',
  styleUrls: ['./main-site.component.css']
})
export class MainSiteComponent {
  loading = false; // Añadido para manejar el estado de carga
  selectedLanguage: string = 'es'; // Declara la propiedad aquí
  alertType: 'info' | 'error' = 'info'; // Añadido 'warning'
  @ViewChild(AlertComponent) alertComponent!: AlertComponent;
  private confirmSubscription!: Subscription;
  private cancelSubscription!: Subscription;

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
  comprobarArticulosTiquet() {
    this.router.navigate(['/articulos-tiquet']);
  }
  listaCompra() {
    this.router.navigate(['/lista']);
  }
  finalizarSesion() {
    this.auth.signOut().then(() => {
      this.router.navigate(['']);
    }).catch(error => {
      console.error('Error al cerrar sesión:', error);
      // Puedes mostrar un mensaje de error si lo necesitas
    });
  }

  cerrarSesion() {
    // Obtiene el texto traducido
    const confirmMessage = this.translate.instant('CONFIRM_LOGOUT');
    this.alertComponent.showAlerts(confirmMessage, 'confirm');
    // Asegúrate de cancelar las suscripciones anteriores si existen
    if (this.confirmSubscription) {
      this.confirmSubscription.unsubscribe();
    }
    if (this.cancelSubscription) {
      this.cancelSubscription.unsubscribe();
    }

    // Suscribirse a las acciones de confirmación y cancelación
    this.confirmSubscription = this.alertComponent.onConfirm.subscribe(() => {
      this.finalizarSesion();
    });

    this.cancelSubscription = this.alertComponent.onCancel.subscribe(() => {
      // Acciones opcionales si se cancela el cierre de sesión
      console.log('El usuario ha cancelado el cierre de sesión');
    });
  }

  ngOnDestroy() {
    // Asegúrate de limpiar las suscripciones para evitar fugas de memoria
    if (this.confirmSubscription) {
      this.confirmSubscription.unsubscribe();
    }
    if (this.cancelSubscription) {
      this.cancelSubscription.unsubscribe();
    }
  }
}
