import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'https://es.openfoodfacts.org/api/v0/product';
  //private searchUrl = 'https://es.world.openfoodfacts.org/api/v0/search';
  private searchUrl = 'https://es.openfoodfacts.org/api/v0/search';

  constructor(private http: HttpClient) { }

  getProductByBarcode(barcode: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${barcode}.json`);
  }

  searchProductsByName(name: string): Observable<any> {
    return this.http.get(`${this.searchUrl}?q=${encodeURIComponent(name)}`);
  }
}
