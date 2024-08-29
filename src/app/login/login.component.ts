import { Component, Input } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { EmailConfirmDialogComponent } from '../email-confirm-dialog/email-confirm-dialog.component';


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
  alertMessage = '';
  showAlerts: boolean = false;


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

  // Añadir una propiedad para gestionar el estado de los botones
buttonState = {
  isDisabled: false,
  isHoverDisabled: false
};

  //Mostramos mensajes
  showAlert(message: string, type: 'success' | 'error' | 'info' | 'warning' | 'info_email' | 'confirm') {
    this.errorMessage = message;
    this.alertType = type;

    // Deshabilitar los botones "Registrar" y "Cancelar" si la alerta no es de tipo 'info_email'
    
    if (type !== 'info_email') {
        this.buttonState.isDisabled = true;
        this.buttonState.isHoverDisabled = true;
        setTimeout(() => {
          this.errorMessage = ''; // Ocultar la alerta
          this.buttonState.isDisabled = false;
          this.buttonState.isHoverDisabled = false;
      }, 2000);
    }  
}

  
  cancelRegister() {
    this.showWelcome = true;
    this.showRegister = false;
    // Limpiar el mensaje de info_email al cancelar el registro
    if (this.alertType === 'info_email') {
      this.errorMessage = ''; // Limpiar el mensaje de alerta
      this.alertType = 'info'; // Cambiar el tipo de alerta a uno neutral
    }
}

   //Confirmar cemail principal
   openEmailConfirmDialog(message: string): Promise<boolean> {
    this.isSubmitDisabled = true; // Deshabilitar el botón

    const dialogRef = this.dialog.open(EmailConfirmDialogComponent, {      
      width: '350px',
      data: { message },
      position: { top: '-30%'} // Ajusta la posición
    });
    return dialogRef.afterClosed().toPromise().finally(() => {
      this.isSubmitDisabled = false; // Habilitar el botón después de cerrar el diálogo
    });      
  }

   //Confirmar creacion usuario
   openConfirmDialog(message: string): Promise<boolean> {
    this.isSubmitDisabled = true; // Deshabilitar el botón

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {      
      width: '350px',
      data: { message },
      position: { top: '-30%',left: '15px'} // Ajusta la posición
    });
    return dialogRef.afterClosed().toPromise().finally(() => {
      this.isSubmitDisabled = false; // Habilitar el botón después de cerrar el diálogo
    });      
  }


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
  // Método para calcular la edad a partir de la fecha de nacimiento
calculateAge(dob: string): number {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  // Si el mes actual es menor que el mes de nacimiento o el mes es el mismo pero el día actual es menor
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
// Método para validar que la fecha de nacimiento esté completa
isDateComplete(dob: string): boolean {
  const dateParts = dob.split('-'); // Suponiendo el formato de fecha es YYYY-MM-DD
  return dateParts.length === 3 && dateParts.every(part => part.trim() !== '');
}
// Método para validar la fecha de nacimiento
isDateValid(dob: string): boolean {
  const dateParts = dob.split('-');
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // Meses en JavaScript son 0-11
  const day = parseInt(dateParts[2], 10);

  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
}



  async registerUser() { 
    
    
/*
    if (this.newUser.password !== this.newUser.confirmPassword) {
      this.showAlert(this.translate.instant('PASSWORD_MISMATCH'), 'error');      
      return;    
    }    
    if (!this.newUser.username) {
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
    } else if (!this.newUser.dob) {
      this.showAlert(this.translate.instant('EMPTY_DOB'), 'warning');
      return;
    } else if (!this.isDateComplete(this.newUser.dob)) {
      // Asegúrate de que la fecha de nacimiento esté completa
      this.showAlert(this.translate.instant('INCOMPLETE_DOB'), 'warning');
      return;
    } else if (!this.isDateValid(this.newUser.dob)) {
      // Asegúrate de que la fecha de nacimiento sea válida
      this.showAlert(this.translate.instant('INVALID_DOB'), 'warning');
      return;
    }
    const age = this.calculateAge(this.newUser.dob);
    if (age < 10) {
      this.showAlert(this.translate.instant('AGE_REQUIREMENT_NOT_MET'), 'warning');
      return;
    }else if (this.newUser.emailPrincipal && !this.isValidEmail(this.newUser.emailPrincipal)) {
      this.showAlert(this.translate.instant('VALID_EMAIL'), 'warning');
      return;
    }*/

   // Abrir el diálogo para confirmar el email principal
   const confirmedEmail = await this.openEmailConfirmDialog(this.newUser.username);
   console.log('1');

   // Verificar si el usuario aceptó el primer diálogo
   if (confirmedEmail) {
       console.log('2');
       
       // Abrir el segundo diálogo para confirmar la creación del usuario
       const confirmed = await this.openConfirmDialog(this.newUser.username);

       if (!confirmed) {
           this.showAlert(this.translate.instant('REGISTRATION_CANCELLED'), 'info');
           return;
       }
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
