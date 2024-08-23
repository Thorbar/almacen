import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { MainSiteComponent } from './main-site/main-site.component';
import { ArticulosComponent } from './articulos/articulos.component';
import { StockActualComponent } from './stock-actual/stock-actual.component';
import { ListaCompraComponent } from './lista-compra/lista-compra.component';
import { LoginComponent } from './login/login.component';


const routes: Routes = [
  //{ path: '', redirectTo: '/', pathMatch: 'full' }, // Redirige la raíz a '/home'
  { path: 'home', component: AppComponent },
  { path: 'main-site', component: MainSiteComponent },
  { path: 'articulos', component: ArticulosComponent },
  { path: 'stock-actual', component: StockActualComponent },
  { path: 'lista', component: ListaCompraComponent },
  { path: '', component: LoginComponent }


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
