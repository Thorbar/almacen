import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { MainSiteComponent } from './main-site/main-site.component';
import { ArticulosComponent } from './articulos/articulos.component';
import { StockActualComponent } from './stock-actual/stock-actual.component';
import { ListaCompraComponent } from './lista-compra/lista-compra.component';
import { LoginComponent } from './login/login.component';
import { CrearUsuarioComponent } from './crear-usuario/crear-usuario.component';
import { ArticulosTiquetComponent } from './articulos-tiquet/articulos-tiquet.component';



const routes: Routes = [
  { path: '', component: LoginComponent }, // Raíz
  { path: 'main-site', component: MainSiteComponent },
  { path: 'articulos', component: ArticulosComponent },
  { path: 'stock-actual', component: StockActualComponent },
  { path: 'lista', component: ListaCompraComponent },
  { path: 'crear-usuario', component: CrearUsuarioComponent },
  { path: 'articulos-tiquet', component: ArticulosTiquetComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
