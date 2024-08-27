import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
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
  showRegister = false;
  loading = false;
  failedAttempts = 0;
  lockoutEndTime: number | null = null;

  newUser = {
    firstName: '',
    lastName: '',
    dob: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    emailPrincipal: ''
  };

  constructor(
    private auth: AngularFireAuth,
    private firestore: AngularFirestore,
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

  showRegisterForm() {
    this.showWelcome = false;
    this.showRegister = true;
  }

  cancelRegister() {
    this.showWelcome = true;
    this.showRegister = false;
  }

  async registerUser() {
    if (this.newUser.password !== this.newUser.confirmPassword) {
      Swal.fire({
        title: this.translate.instant('PASSWORD_MISMATCH'),
        text: this.translate.instant('PLEASE_RETRY'),
        icon: 'error',
        confirmButtonText: this.translate.instant('OK')
      });
      return;
    }
/*
    if (!this.validateRegisterFields()) {
      return; // Detener el registro si hay campos vacíos
    }*/

    const auth = getAuth();
    this.loading = true;

    try {
      const existingUser = await fetchSignInMethodsForEmail(auth, this.newUser.email);

      if (existingUser.length > 0) {
        Swal.fire({
          title: this.translate.instant('EMAIL_ALREADY_EXISTS'),
          icon: 'error',
          confirmButtonText: this.translate.instant('OK')
        });
        this.loading = false;
        return;
      }

      if (this.newUser.emailPrincipal) {
        const principalUser = await fetchSignInMethodsForEmail(auth, this.newUser.emailPrincipal);
        if (principalUser.length === 0) {
          Swal.fire({
            title: this.translate.instant('EMAIL_PRINCIPAL_NOT_FOUND'),
            text: this.translate.instant('CONTACT_EMAIL_PRINCIPAL_OWNER'),
            icon: 'error',
            confirmButtonText: this.translate.instant('OK')
          });
          this.loading = false;
          return;
        }
      }
      // Crear usuario en Firebase Authentication
      await createUserWithEmailAndPassword(auth, this.newUser.email, this.newUser.password);

      // Crear documento en Firestore para el proyecto
      await this.firestore.collection('projects').doc(`almacen_${this.newUser.username}`).set({
        firstName: this.newUser.firstName,
        lastName: this.newUser.lastName,
        dob: this.newUser.dob,
        email: this.newUser.email,
        username: this.newUser.username,
        emailPrincipal: this.newUser.emailPrincipal || null,
        createdAt: new Date()
      });
      
      Swal.fire({
        title: this.translate.instant('ACCOUNT_CREATED'),
        icon: 'success',
        confirmButtonText: this.translate.instant('OK')
      });

      this.showWelcome = true;
      this.showRegister = false;
      this.loading = false;


      //this.router.navigate(['/main-site']);
    } catch (error) {
      Swal.fire({
        title: this.translate.instant('ERROR_CREATING_ACCOUNT'),
        text: (error as Error).message,
        icon: 'error',
        confirmButtonText: this.translate.instant('TRY_AGAIN')
      });
    } finally {
      this.loading = false;
    }
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
/*
    if (!this.validateLoginFields()) {
      return; // Detener el inicio de sesión si hay campos vacíos
    }
*/
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
        this.resetFailedAttempts();
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

  validateLoginFields(): boolean {
    if (!this.email || !this.password) {
      Swal.fire({
        title: this.translate.instant('FIELD_REQUIRED'),
        text: this.translate.instant('PLEASE_FILL_IN_ALL_FIELDS'),
        icon: 'warning',
        confirmButtonText: this.translate.instant('OK')
      });
      return false;
    }
    return true;
  }
/*
  validateRegisterFields(): boolean {
    if (!this.newUser.firstName || !this.newUser.email || !this.newUser.password || !this.newUser.confirmPassword) {
      Swal.fire({
        title: this.translate.instant('FIELD_REQUIRED'),
        text: this.translate.instant('PLEASE_FILL_IN_ALL_FIELDS'),
        icon: 'warning',
        confirmButtonText: this.translate.instant('OK')
      });
      return false;
    }
    return true;
  }*/

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
