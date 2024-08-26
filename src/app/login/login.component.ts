import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { ChangeDetectorRef } from '@angular/core';
import Swal from 'sweetalert2';

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
  failedAttempts = 0; // Número de intentos fallidos
  lockoutEndTime: number | null = null; // Tiempo de fin de bloqueo

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

    // Cargar el estado de bloqueo desde localStorage
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
    localStorage.setItem('selectedLanguage', lang)
  }

  login() {
    if (this.isLockedOut()) {
      const remainingTime = Math.ceil((this.lockoutEndTime! - Date.now()) / 60000);
      Swal.fire({
        title: this.translate.instant('ACCOUNT_LOCKED'),
        text: `${this.translate.instant('RETRY_AFTER')} ${remainingTime} ${this.translate.instant('MINUTES')}`,
        icon: 'warning',
        confirmButtonText: this.translate.instant('OK')
      });
      return;
    }

    this.showWelcome = false;
    this.loading = true;

    if (this.username === 'thorbar') {
      this.email = 'davidribe86@gmail.com';
    }

    const auth = getAuth();

    signInWithEmailAndPassword(auth, this.email, this.password)
      .then((userCredential) => {
        console.log("Login successful:", userCredential);
        this.router.navigate(['/main-site']);
        this.resetFailedAttempts(); // Resetea el conteo de intentos fallidos en caso de éxito
      })
      .catch((error) => {
        this.failedAttempts += 1;

        let errorMessage = '';
        if (error.code === 'auth/user-not-found') {
          errorMessage = this.translate.instant('USER_NOT_FOUND');
        } else if (error.code === 'auth/wrong-password') {
          errorMessage = this.translate.instant('WRONG_PASSWORD');
        } else {
          errorMessage = this.translate.instant('LOGIN_FAILED_MESSAGE');
        }

        if (this.failedAttempts >= 3) {
          this.startLockout();
        }

        Swal.fire({
          title: this.translate.instant('LOGIN_FAILED'),
          text: errorMessage,
          icon: 'error',
          confirmButtonText: this.translate.instant('TRY_AGAIN')
        });

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
}
