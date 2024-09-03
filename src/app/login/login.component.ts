import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  selectedLanguage: string = 'es';
  username: string = '';
  email: string = '';
  password: string = '';
  showWelcome = true;
  loading = false;
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

  changeLanguage(lang: string) {
    this.selectedLanguage = lang;
    this.translate.setDefaultLang(lang);
    this.translate.use(lang);
    localStorage.setItem('selectedLanguage', lang);
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

    if (this.username === 'thorbar') {
      this.email = 'davidribe86@gmail.com';
    }

    signInWithEmailAndPassword(auth, this.email, this.password)
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
    const emailToRecover = this.email || this.usernameToEmail(this.username);
    
    if (!emailToRecover) {
      alert(this.translate.instant('ENTER_EMAIL_OR_USERNAME'));
      return;
    }

    sendPasswordResetEmail(auth, emailToRecover)
      .then(() => {
        alert(this.translate.instant('RESET_EMAIL_SENT'));
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
        alert(errorMessage);
      });
  }

  // Método opcional para convertir el nombre de usuario en un correo electrónico (puedes personalizar esto)
  usernameToEmail(username: string): string | null {
    if (username === 'thorbar') {
      return 'davidribe86@gmail.com';
    }
    return null; // Agrega más lógica si tienes más usuarios
  }
}
