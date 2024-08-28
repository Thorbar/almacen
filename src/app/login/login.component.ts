import { Component, Input } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';


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
  isSubmitDisabled: boolean = false;
  showAlertMail = false;
  alertMessage = '';


  errorMessage: string = '';
  alertType: 'success' | 'error' | 'info' | 'warning' | 'info_email' | 'confirm' = 'info'; // Añadido 'warning'

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
    private cdRef: ChangeDetectorRef,
    private dialog: MatDialog
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
    this.showAlert(this.translate.instant('EMAIL_PRINCIPAL_NOT_FOUND'), 'info_email');

  }

  cancelRegister() {
    this.showWelcome = true;
    this.showRegister = false;
  }
  //Mostramos mensajes
  showAlert(message: string, type: 'success' | 'error' | 'info' | 'warning' | 'info_email' | 'confirm') {
    this.errorMessage = message;
    this.alertType = type;

    // Si la alerta es de tipo 'info_email', no se oculta automáticamente
    if (type !== 'info_email') {
      setTimeout(() => {
        this.errorMessage = ''; // Esto oculta el alert después de 2 segundos
      }, 2000);
    } 
  }

  //Confirmar creacion usuario
  openConfirmDialog(username: string): Promise<boolean> {
    this.isSubmitDisabled = true; // Deshabilitar el botón

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {      
      width: '350px',
      data: { username },
      position: { top: '-30%'} // Ajusta la posición
    });

    return dialogRef.afterClosed().toPromise().finally(() => {
      this.isSubmitDisabled = false; // Habilitar el botón después de cerrar el diálogo
    });  }
  isPasswordValid(password: string): boolean {
    // Expresión regular para validar:
    // - Al menos 9 caracteres
    // - Al menos una letra mayúscula
    // - Al menos un carácter especial como !, @, #, $, etc.
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+{}|:"<>?[\]\/\\;.,]).{9,}$/;
    return passwordRegex.test(password);
  }
  isValidEmail(email: string): boolean {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  }


  async registerUser() {
    if (this.newUser.password !== this.newUser.confirmPassword) {
      this.showAlert(this.translate.instant('PASSWORD_MISMATCH'), 'error');
      return;
    } else if (!this.newUser.username) {
      this.showAlert(this.translate.instant('EMPTY_USER'), 'warning');
      return;
    } else if (this.newUser.username.length < 4) {
      this.showAlert(this.translate.instant('SHORT_USER'), 'warning');
      return;
    } else if (!this.newUser.password || !this.newUser.confirmPassword) {
      this.showAlert(this.translate.instant('EMPTY_PASSWORD'), 'warning');
      return;
    } else if (!this.isPasswordValid(this.newUser.password) || !this.isPasswordValid(this.newUser.confirmPassword)) {
      this.showAlert(this.translate.instant('INVALID_PASSWORD'), 'error');
      return;
    } else if (!this.newUser.email) {
      this.showAlert(this.translate.instant('EMPTY_EMAIL'), 'warning');
      return;
    } else if (this.newUser.email && !this.isValidEmail(this.newUser.email)) {
      this.showAlert(this.translate.instant('VALID_EMAIL'), 'warning');
      return;
    } else if (!this.newUser.firstName) {
      this.showAlert(this.translate.instant('EMPTY_NAME'), 'warning');
      return;
    } else if (!this.newUser.lastName) {
      this.showAlert(this.translate.instant('EMPTY_LASTNAME'), 'warning');
      return;
    } else if (!this.newUser.emailPrincipal) {
      this.showAlert(this.translate.instant('EMAIL_PRINCIPAL_NOT_FOUND' || 'CONTACT_EMAIL_PRINCIPAL_OWNER'), 'info_email');
      return;
    } else if (!this.newUser.dob) {
      this.showAlert(this.translate.instant('EMPTY_DOB' || 'CONTACT_EMAIL_PRINCIPAL_OWNER'), 'info_email');
      return;
    }


    // Preguntar confirmación antes de continuar
    const confirmed = await this.openConfirmDialog(this.newUser.username);
    if (!confirmed) {
      this.showAlert(this.translate.instant('REGISTRATION_CANCELLED'), 'info');
      return;
    }
    this.loading = true;

    try {
      const auth = getAuth();
      const existingUser = await fetchSignInMethodsForEmail(auth, this.newUser.email);

      if (existingUser.length > 0) {
        this.showAlert(this.translate.instant('EMAIL_ALREADY_EXISTS'), 'error');
        this.loading = false;
        return;
      }

      if (this.newUser.emailPrincipal) {
        const principalUser = await fetchSignInMethodsForEmail(auth, this.newUser.emailPrincipal);
        if (principalUser.length === 0) {
          this.showAlert(this.translate.instant('EMAIL_PRINCIPAL_NOT_FOUND'||'CONTACT_EMAIL_PRINCIPAL_OWNER'), 'error');
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
      
      this.showAlert(this.translate.instant('ACCOUNT_CREATED'), 'success');
      this.showWelcome = true;
      this.showRegister = false;
      this.loading = false;

      //this.router.navigate(['/main-site']);
    } catch (error) {
      this.showAlert(this.translate.instant('ERROR_CREATING_ACCOUNT'||'TRY_AGAIN'), 'error');
    } finally {
      this.loading = false;
    }
  }

  login() {
    const auth = getAuth();
    if (this.isLockedOut()) {
      const remainingTime = Math.ceil((this.lockoutEndTime! - Date.now()) / 60000);
      this.showAlert(`${this.translate.instant('RETRY_AFTER')} ${remainingTime} ${this.translate.instant('MINUTES')}`, 'info');
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

        this.showAlert(errorMessage, 'error');
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
