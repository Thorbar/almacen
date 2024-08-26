import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'] // Asegúrate de que el archivo CSS esté importado aquí
})
export class LoginComponent {
  selectedLanguage: string = 'es'; // Declara la propiedad aquí
  username: string = '';
  email: string = '';
  password: string = '';
  showWelcome = true;
  loading = false; // Añadido para manejar el estado de carga

  constructor(
    private auth: AngularFireAuth,
    private router: Router,
    private translate: TranslateService,
    private cdRef: ChangeDetectorRef // Importa ChangeDetectorRef

  ) {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    this.selectedLanguage = savedLanguage || 'es';
    this.translate.setDefaultLang(this.selectedLanguage);
    this.translate.use(this.selectedLanguage);
  }

  ngOnInit() {
    this.showWelcome = true;
    this.loading = false;
  }

  changeLanguage(lang: string) {
    this.selectedLanguage = lang; // Actualiza el idioma seleccionado
    this.translate.setDefaultLang(lang);
    this.translate.use(lang);
    localStorage.setItem('selectedLanguage', lang)
  }

  login() {
    this.showWelcome = false;
    this.loading = true; // Muestra el spinner

    if (this.username === 'thorbar') {
      this.email = 'davidribe86@gmail.com';
    }

    // Asegúrate de que `getAuth()` esté inicializado correctamente
    const auth = getAuth();

    signInWithEmailAndPassword(auth, this.email, this.password)
      .then((userCredential) => {
        // El inicio de sesión fue exitoso, maneja la navegación o el estado aquí
        console.log("Inicio de sesión exitoso:", userCredential);
        this.router.navigate(['/main-site']); // Redirige a la página de inicio
      })
      .catch((error) => {
        // Manejo de errores
        console.error("Error de inicio de sesión:", error.message);
        // Muestra un mensaje de error al usuario sin detener la aplicación
        alert("Usuario o contraseña incorrectos. Por favor, intenta nuevamente.");
        // Forzar la actualización de la vista
        this.showWelcome = true;
        this.cdRef.detectChanges(); // Añade esto para asegurar la actualización
      })
      .finally(() => {
        this.loading = false; // Oculta el spinner independientemente del resultado
        this.cdRef.detectChanges(); // Forzar la actualización después de cualquier cambio

      });
  }
}
