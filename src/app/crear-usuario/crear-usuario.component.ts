import { Component, ViewChild  } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { getAuth, createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { EmailConfirmDialogComponent } from '../email-confirm-dialog/email-confirm-dialog.component';
import { User } from 'firebase/auth';
import { AlertComponent } from '../alert/alert.component';



@Component({
  selector: 'app-crear-usuario',
  templateUrl: './crear-usuario.component.html',
  styleUrls: ['./crear-usuario.component.css']
})
export class CrearUsuarioComponent {
  selectedLanguage: string = 'es';
  username: string = '';
  email: string = '';
  passwordRegister: string = '';
  showRegister = false;
  isSubmitDisabled: boolean = false;
  errorMessage: string = '';
  @ViewChild(AlertComponent) alertComponent!: AlertComponent;

  newUser = {
    firstName: '',
    lastName: '',
    dob: '',
    email: '',
    username: '',
    passwordRegister: '',
    confirmPassword: '',
    emailPrincipal: ''
  };

  buttonState = {
    isDisabled: false,
    isHoverDisabled: false
  };


  constructor(
    private auth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router,
    private translate: TranslateService,
    private dialog: MatDialog
  ) {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    this.selectedLanguage = savedLanguage || 'es';
    this.translate.setDefaultLang(this.selectedLanguage);
    this.translate.use(this.selectedLanguage);
  }

  ngOnInit() {
    this.showRegister  = true;
    //this.showAlert(this.translate.instant('EMAIL_PRINCIPAL_NOT_FOUND'), 'info_email');
  }

  changeLanguage(lang: string) {
    this.selectedLanguage = lang;
    this.translate.setDefaultLang(lang);
    this.translate.use(lang);
    localStorage.setItem('selectedLanguage', lang);
  }
 /*
   showAlert(message: string, type: 'success' | 'error' | 'info' | 'warning' | 'info_email' | 'confirm') {
    this.errorMessage = message;
    this.alertType = type;
    console.log(this.alertType);
    // Deshabilitar los botones solo si el tipo de alerta no es 'info_email'
    if (type !== 'info_email') {
      this.buttonState.isDisabled = true;
      this.buttonState.isHoverDisabled = true;
      setTimeout(() => {
        this.errorMessage = ''; // Ocultar la alerta
        this.buttonState.isDisabled = false;
        this.buttonState.isHoverDisabled = false;
      }, 2000);      
    }    
  }*/

  cancelRegister() {
    this.showRegister = false;
    this.router.navigate(['']);
}

   //Confirmar cemail principal
   openEmailConfirmDialog(message: string): Promise<boolean> {
    this.isSubmitDisabled = true; // Deshabilitar el botón

    const dialogRef = this.dialog.open(EmailConfirmDialogComponent, {      
      width: '350px',
      data: { message },
      position: { top: '-30%'} // Ajusta la posición
    });
    return dialogRef.afterClosed().toPromise().then(result => {
      this.isSubmitDisabled = false; // Habilitar el botón después de cerrar el diálogo
      return result; // Devolver el resultado (true/false)
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

  buttonDisabled(){
  this.buttonState.isDisabled = true;
  this.buttonState.isHoverDisabled = true;
  }
  buttonEnabled() {
    this.buttonState.isDisabled = false;
    this.buttonState.isHoverDisabled = false;
  }
  timerButton() {
    this.buttonDisabled();
    setTimeout(() => {      
      this.alertComponent.cancel();
      this.buttonEnabled();
    }, 1500); 
  }
  async registerUser() {        
      if (!this.newUser.username) {
        const missingUsername = this.translate.instant('EMPTY_USER');
        this.alertComponent.showAlerts(missingUsername, 'warning');
        this.timerButton();
        return;
    }
    if (this.newUser.username.length < 4) {
      const shortUsername = this.translate.instant('SHORT_USER');
      this.alertComponent.showAlerts(shortUsername, 'warning');
      this.timerButton();
      return;
    }
    if (!this.newUser.passwordRegister) {
      const missingPassword = this.translate.instant('EMPTY_PASSWORD');
      this.alertComponent.showAlerts(missingPassword, 'warning');
      this.timerButton();
      return;
    }
    if (!this.isPasswordValid(this.newUser.passwordRegister)) {
      const invalidPassword = this.translate.instant('INVALID_PASSWORD');
      this.alertComponent.showAlerts(invalidPassword, 'error');
      this.timerButton();
      return;
    }
    if (!this.newUser.confirmPassword) {
      const missingPassword = this.translate.instant('EMPTY_PASSWORD');
      this.alertComponent.showAlerts(missingPassword, 'warning');
      this.timerButton();
      return;
    }
    if (this.newUser.passwordRegister !== this.newUser.confirmPassword) {
      const mismatchPassword = this.translate.instant('PASSWORD_MISMATCH');
      this.alertComponent.showAlerts(mismatchPassword, 'error');
      this.timerButton();
      return;
    }
    if (!this.newUser.email) {
      const emptyEmail = this.translate.instant('EMPTY_EMAIL');
      this.alertComponent.showAlerts(emptyEmail, 'warning');
      this.timerButton();
      return;
    }
    if (!this.isValidEmail(this.newUser.email)) {
      const validEmail = this.translate.instant('VALID_EMAIL');
      this.alertComponent.showAlerts(validEmail, 'warning');
      this.timerButton();
      return;
    }
    if (!this.newUser.dob) {
      const emptyDoB = this.translate.instant('EMPTY_DOB');
      this.alertComponent.showAlerts(emptyDoB, 'warning');
      this.timerButton();
      return;
    }
    if (!this.isDateComplete(this.newUser.dob) || !this.isDateValid(this.newUser.dob)) {
      const invalidDoB = this.translate.instant('INVALID_DOB');
      this.alertComponent.showAlerts(invalidDoB, 'warning');
      this.timerButton();
      return;
    }
    const age = this.calculateAge(this.newUser.dob);
    if (age < 10) {
      const ageRequirementNotMet = this.translate.instant('AGE_REQUIREMENT_NOT_MET');
      this.alertComponent.showAlerts(ageRequirementNotMet, 'warning');
      this.timerButton();
      return;
    }
    if (!this.newUser.firstName) {
      const ageRequirementNotMet = this.translate.instant('EMPTY_NAME');
      this.alertComponent.showAlerts(ageRequirementNotMet, 'warning');
      this.timerButton();
      return;
    } if (!this.newUser.lastName) {
      const ageRequirementNotMet = this.translate.instant('EMPTY_LASTNAME');
      this.alertComponent.showAlerts(ageRequirementNotMet, 'warning');
      this.timerButton();
      return;
    } if (!this.newUser.dob) {
      const ageRequirementNotMet = this.translate.instant('EMPTY_DOB');
      this.alertComponent.showAlerts(ageRequirementNotMet, 'warning');
      this.timerButton();
      return;
    } 

     // Abrir el diálogo para confirmar el email principal
     const confirmedEmail = await this.openEmailConfirmDialog(this.newUser.username);   
     // Verificar si el usuario aceptó el primer diálogo
     if (confirmedEmail) {      
         // Abrir el segundo diálogo para confirmar la creación del usuario
         const confirmed = await this.openConfirmDialog(this.newUser.username);
         if (confirmed) {

      try {
        const auth = getAuth();
        const existingUser = await fetchSignInMethodsForEmail(auth, this.newUser.email);
        console.log('existingUser ', existingUser);


        if (existingUser.length > 0) {
         // this.showAlert(this.translate.instant('EMAIL_ALREADY_EXISTS'), 'error');
          console.log('EMAIL_ALREADY_EXISTS ', existingUser);
          return;
        }
        // Crear usuario en Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, this.newUser.email, this.newUser.passwordRegister);
        console.log('userCredential ', userCredential);
        const userId = userCredential.user.uid; // Obtener el UID del usuario
        console.log('userId ', userId);

        /*
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
  */

        // Aquí es donde creamos el proyecto almacen dentro de su cuenta Firebase
        await this.createUserProject(userCredential.user);      
        //this.showAlert(this.translate.instant('ACCOUNT_CREATED'), 'success');
        console.log('ACCOUNT_CREATED ', userCredential.user);
        this.showRegister = false;
        this.router.navigate(['']);
      
      } catch (error) {
        //this.showAlert(this.translate.instant('ERROR_CREATING_ACCOUNT'||'TRY_AGAIN'), 'error');
      } finally {
      }
           
         }else{
           // this.showAlert(this.translate.instant('REGISTRATION_CANCELLED'), 'info');
            return;          
         }
     } else{
      //this.showAlert(this.translate.instant('REGISTRATION_CANCELLED'), 'info');
      return;    
     }  
  }
  async createUserProject(user: User) {
      // Obtener una referencia a la Firestore del usuario autenticado
      const userFirestore = this.getUserFirestore(user);

      // Crear un proyecto 'almacen' dentro de la cuenta del usuario
      await userFirestore.collection('projects').doc('almacen').set({
          nombre: `Almacén de ${user.displayName || user.email}`,
          descripcion: `Descripción del almacén de ${user.displayName || user.email}`,
          creadoEn: new Date()
      });
  }

  getUserFirestore(user: User): AngularFirestore {
      // Aquí puedes obtener una instancia de Firestore para el usuario autenticado.
      // Si Firebase está configurado correctamente en tu aplicación, la instancia de Firestore
      // que obtienes con AngularFirestore ya está asociada con el usuario autenticado.
      // No es necesario pasar ningún UID manualmente.

      return this.firestore; // La misma instancia de AngularFirestore que usas en toda la aplicación
    }  
  }
