import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'https://es.openfoodfacts.org/api/v0/product';
  constructor(private http: HttpClient) { }

  getProductByBarcode(barcode: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${barcode}.json`);
  }
}
