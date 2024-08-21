import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'] // Asegúrate de que el archivo CSS esté importado aquí
})
export class LoginComponent {
  username: string = '';
  email: string = '';
  password: string = '';
  showWelcome = true;
  loading = false; // Añadido para manejar el estado de carga



  constructor(private auth: AngularFireAuth, 
              private router: Router) {}

  login() {
    this.showWelcome = false;
    this.loading = true; // Muestra el spinner
    if(this.email = 'thorbar'){
      this.email = 'davidribe86@gmail.com'
    }
    this.auth.signInWithEmailAndPassword(this.email, this.password)
      .then(() => {
        this.loading = false;
        this.router.navigate(['/main-site']);
      })
      .catch(err => {
        this.loading = false; // Oculta el spinner en caso de error
        alert('Login failed: ' + err.message);
        this.router.navigate(['/home']);
      });
  }
}
