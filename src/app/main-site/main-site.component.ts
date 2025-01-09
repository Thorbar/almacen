import { Component, ViewChild, OnInit, AfterViewInit } from '@angular/core';
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
export class MainSiteComponent implements OnInit, AfterViewInit {
  loading = false; // Añadido para manejar el estado de carga
  selectedLanguage: string = 'es'; // Declara la propiedad aquí
  alertType: 'info' | 'error' = 'info'; // Añadido 'warning'
  @ViewChild(AlertComponent) alertComponent!: AlertComponent;
  private confirmSubscription!: Subscription;
  private cancelSubscription!: Subscription;
  bloqueadoLista = false;
  bloqueadoStock = false;
  mensajeEsperaLista = '';
  mensajeEsperaStock = '';



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

  ngOnInit() {
    this.verificarEstadoBotones();
  }
  ngAfterViewInit() {
    // Este es el lugar donde podemos estar seguros de que el ViewChild ha sido inicializado
    if (this.alertComponent) {
      console.log('AlertComponent está disponible');
    }
  }
  verificarEstadoBotones() {
    const ahora = new Date().getTime();

    // Verificar el estado de bloqueo para "Lista"
    this.verificarBloqueo(
      'bloqueo_lista',
      ahora,
      (tiempoRestante) => {
        this.bloqueadoLista = true;
        this.mensajeEsperaLista = `Se está creando un índice para tu BBDD de Lista. Tienes que esperar ${Math.ceil(tiempoRestante / 60)} minutos.`;        
        console.log(this.mensajeEsperaLista);
          this.alertComponent.showAlerts(this.mensajeEsperaLista, 'warning');
          setTimeout(() => {
            this.alertComponent.cancel();  // Oculta el mensaje después del tiempo especificado          
          }, 5000);
      },
      () => {
        this.bloqueadoLista = false;
        this.mensajeEsperaLista = '';
      }
    );
    // Verificar el estado de bloqueo para "Stock"
    this.verificarBloqueo(
      'bloqueo_stock',
      ahora,
      (tiempoRestante) => {
        this.bloqueadoStock = true;
        this.mensajeEsperaStock = `Se está creando un índice para tu BBDD de Stock. Tienes que esperar ${Math.ceil(tiempoRestante / 60)} minutos.`;
        console.log(this.mensajeEsperaStock);
          this.alertComponent.showAlerts(this.mensajeEsperaStock, 'warning');
          setTimeout(() => {
            this.alertComponent.cancel();  // Oculta el mensaje después del tiempo especificado
          }, 5000);
      },
      () => {
        this.bloqueadoStock = false;
        this.mensajeEsperaStock = '';
      }
    );
  }

  verificarBloqueo(
    claveLocalStorage: string,
    tiempoActual: number,
    onBloqueado: (tiempoRestante: number) => void,
    onDesbloqueado: () => void
  ) {
    const bloqueo = localStorage.getItem(claveLocalStorage);
    if (bloqueo) {
      const tiempoBloqueo = parseInt(bloqueo, 10);
      const diferencia = tiempoActual - tiempoBloqueo;

      if (diferencia < 5 * 60 * 1000) {
        const tiempoRestante = Math.ceil((5 * 60 * 1000 - diferencia) / 1000);
        onBloqueado(tiempoRestante);
      } else {
        localStorage.removeItem(claveLocalStorage);
        onDesbloqueado();
      }
    } else {
      onDesbloqueado();
    }
  }

  consultarBaseDatos() {
    if (!this.bloqueadoStock) {
      this.router.navigate(['/stock-actual']);
    }
  }
  comprobarArticulos() {
    this.router.navigate(['/articulos']);
  }
  comprobarArticulosTiquet() {
    this.router.navigate(['/articulos-tiquet']);
  }
  listaCompra() {
    if (!this.bloqueadoLista) {
      this.router.navigate(['/lista']);
    }
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
