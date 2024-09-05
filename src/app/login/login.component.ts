import { Component, ChangeDetectorRef, ViewChild} from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { TranslateService } from '@ngx-translate/core';
import { AlertComponent } from '../alert/alert.component';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  selectedLanguage: string = 'es';
  currentFlag: string = 'assets/es.jpg';
  selectedLanguageLabel: string = 'Español';
  @ViewChild(AlertComponent) alertComponent!: AlertComponent;
  private confirmSubscription!: Subscription;
  private cancelSubscription!: Subscription;



  // Lista de idiomas disponibles
  languages = [
    { code: 'es', label: 'Español', flag: 'assets/es.jpg' },
    { code: 'cat', label: 'Català', flag: 'assets/cat.jpg' },
    { code: 'en', label: 'English', flag: 'assets/uk.jpg' }
  ];

  emailLogin: string = '';
  passwordLogin: string = '';
  showWelcome = true;
  loading = false;
  confirmEmailReset = false;
  isModalVisible: boolean = false;
  failedAttempts = 0;
  lockoutEndTime: number | null = null;

  constructor(
    private auth: AngularFireAuth,
    private router: Router,
    private translate: TranslateService,
    private cdRef: ChangeDetectorRef
  ) {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    this.selectedLanguage = savedLanguage || 'es';
    this.translate.setDefaultLang(this.selectedLanguage);
    this.translate.use(this.selectedLanguage);

    const savedLockoutEndTime = localStorage.getItem('lockoutEndTime');
    this.lockoutEndTime = savedLockoutEndTime ? parseInt(savedLockoutEndTime, 10) : null;
  }

  ngOnInit() {
    this.showWelcome = true;
    this.loading = false;    
  }

  onLanguageChange(event: any) {
    const selectedLang = event.target.value;
    this.selectedLanguage = selectedLang;
    this.translate.use(selectedLang);


    this.changeLanguage(selectedLang);
  }

  changeLanguage(langCode: string) {
    this.selectedLanguage = langCode;

    this.updateFlag(langCode);

    // Guarda la selección de idioma en el localStorage
    localStorage.setItem('selectedLanguage', langCode);
  }
  // Método para actualizar la bandera según el idioma seleccionado
  updateFlag(languageCode: string) {
    const selectedLang = this.languages.find(lang => lang.code === languageCode);
    if (selectedLang) {
      this.currentFlag = selectedLang.flag; // Actualiza la bandera
    }
  }

  
  login() {
    const auth = getAuth();
    if (this.isLockedOut()) {
      const remainingTime = Math.ceil((this.lockoutEndTime! - Date.now()) / 60000);
      alert(`${this.translate.instant('RETRY_AFTER')} ${remainingTime} ${this.translate.instant('MINUTES')}`);
      return;
    }

    this.showWelcome = false;
    this.loading = true;

    signInWithEmailAndPassword(auth, this.emailLogin, this.passwordLogin)
      .then((userCredential) => {
        console.log("Login successful:", userCredential);
        this.router.navigate(['/main-site']);
        this.resetFailedAttempts();
      })
      .catch((error) => {
        this.failedAttempts += 1;
        let errorMessage = '';
        
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = this.translate.instant('USER_NOT_FOUND');
            break;
          case 'auth/wrong-password':
            errorMessage = this.translate.instant('WRONG_PASSWORD');
            break;
          default:
            errorMessage = this.translate.instant('LOGIN_FAILED_MESSAGE');
            break;
        }

        alert(errorMessage);

        if (this.failedAttempts >= 3) {
          this.startLockout();
        }

        this.showWelcome = true;
        this.loading = false;
        this.cdRef.detectChanges();
      })
      .finally(() => {
        this.loading = false;
        this.cdRef.detectChanges();
      });
  }

  isLockedOut(): boolean {
    if (this.lockoutEndTime && Date.now() < this.lockoutEndTime) {
      return true;
    }
    return false;
  }

  startLockout() {
    this.lockoutEndTime = Date.now() + 10 * 60 * 1000; // Bloquear por 10 minutos
    localStorage.setItem('lockoutEndTime', this.lockoutEndTime.toString());
  }

  resetFailedAttempts() {
    this.failedAttempts = 0;
    this.lockoutEndTime = null;
    localStorage.removeItem('lockoutEndTime');
  }

  createUser() {
    this.router.navigate(['crear-usuario']);
  }

  // Nueva función para recuperar contraseña
  recoverPassword() {
    const auth = getAuth();
    const emailToRecover = this.emailLogin;

    if (!emailToRecover) {
      // Mostrar alerta con solo botón de aceptar
      const errorMessage = this.translate.instant('ENTER_EMAIL_OR_USERNAME');
      this.alertComponent.showAlerts(errorMessage, 'soli');
      console.log('ENTER_EMAIL_OR_USERNAME');
      return;
    } else {
      // Mostrar alerta de confirmación
      const confirmMessage = this.translate.instant('CONFIRM_PASSWORD_RESET');
      this.alertComponent.showAlerts(confirmMessage, 'confirm');
      // Suscribirse a las respuestas de la alerta
      this.confirmSubscription = this.alertComponent.onConfirm.subscribe(() => {
        this.confirmEmailReset = true;
        this.sendPasswordResetEmail(auth, emailToRecover);
      });

      this.cancelSubscription = this.alertComponent.onCancel.subscribe(() => {
        console.log('El usuario ha cancelado el envío del correo de recuperación de contraseña.');
      });
    }
  }
  private sendPasswordResetEmail(auth: any, emailToRecover: string) {
    if (this.confirmEmailReset) {
      sendPasswordResetEmail(auth, emailToRecover)
        .then(() => {
          // Mostrar mensaje de éxito y cerrar después de 2 segundos
          const successMessage = this.translate.instant('RESET_EMAIL_SENT');
          this.alertComponent.showAlerts(successMessage, 'info');
          setTimeout(() => this.alertComponent.cancel(), 2000);
        })
        .catch((error) => {
          let errorMessage = '';
          switch (error.code) {
            case 'auth/user-not-found':
              errorMessage = this.translate.instant('USER_NOT_FOUND');
              break;
            case 'auth/invalid-email':
              errorMessage = this.translate.instant('INVALID_EMAIL');
              break;
            default:
              errorMessage = this.translate.instant('RESET_EMAIL_FAILED');
              break;
          }
          // Mostrar mensaje de error y cerrar después de 2 segundos
          this.alertComponent.showAlerts(errorMessage, 'error');
          setTimeout(() => this.alertComponent.cancel(), 2000);
        });
    }
  }
  ngOnDestroy() {
    // Limpiar las suscripciones para evitar fugas de memoria
    if (this.confirmSubscription) {
      this.confirmSubscription.unsubscribe();
    }
    if (this.cancelSubscription) {
      this.cancelSubscription.unsubscribe();
    }
  }
}
