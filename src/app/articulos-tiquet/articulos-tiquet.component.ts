import { Component } from '@angular/core';
import { Router } from '@angular/router';
import Tesseract from 'tesseract.js';
import { createWorker } from 'tesseract.js';
import { FirestoreService } from '../services/firestore.service';
import { ProductService } from '../services/product.service';

interface TicketItem {
  description: string;
  quantity: number;
  price: number;
  barcode?: string;
  establecimiento?: string;
  fechaUltimaCompra?: Date;
  fechaUltimoRetiro?: Date;
}

@Component({
  selector: 'app-articulos-tiquet',
  templateUrl: './articulos-tiquet.component.html',
  styleUrls: ['./articulos-tiquet.component.css']
})
export class ArticulosTiquetComponent {
  ticketImage: string | ArrayBuffer | null = null;
  ocrResult: string = '';
  items: TicketItem[] = [];
  isLoading: boolean = false;
  successMessage: string = ''; // Nuevo campo para almacenar el mensaje de éxito
  isFileUpload = false;
  isCameraCapture = false;

  constructor(
    private firestoreService: FirestoreService,
    private productService: ProductService,
    private router: Router
  ) { }

  selectFileMethod() {
    this.isFileUpload = true;
    this.isCameraCapture = false;
  }
  captureImageMethod() {
    this.isFileUpload = false;
    this.isCameraCapture = true;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        this.ticketImage = reader.result;
        this.ocrResult = ''; // Limpiar el resultado anterior cuando se selecciona una nueva imagen
      };
      reader.readAsDataURL(file);
    }
  }


  onCameraImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.ticketImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async processTicket() {
    if (!this.ticketImage) {
      console.log('No se ha cargado ninguna imagen de tiquet.');
      return;
    }
    this.isLoading = true; // Mostrar spinner
    try {
      const worker = await createWorker('spa');
      await worker.reinitialize();
      const image = await this.convertToImage(this.ticketImage);
      const { data: { text } } = await worker.recognize(image);

      this.ocrResult = text;
      console.log('Texto del tiquet:', this.ocrResult);

      await worker.terminate(); // Terminamos el worker

      this.processTicketData(); // Procesamos los datos extraídos

    } catch (error) {
      console.error('Error procesando el OCR:', error);
    } 
  }

  async convertToImage(ticketImage: string | ArrayBuffer | null): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      if (typeof ticketImage === 'string') {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = ticketImage;
      } else if (ticketImage instanceof ArrayBuffer) {
        const blob = new Blob([ticketImage]);
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = reject;
        img.src = url;
      } else {
        reject(new Error('Formato de imagen no soportado'));
      }
    });
  }

  async processTicketData() {
    const lines = this.ocrResult.split('\n');
    this.items = [];

    const itemPattern = /^(\d+)\s+(.+?)\s+([\d,]+(?:\.\d{2})?)$/;
    const establishmentPattern = /(?:Establecimiento|Lugar):\s*(.*)/i;

    for (const line of lines) {
      const itemMatch = line.match(itemPattern);
      if (itemMatch) {
        console.log('Coincidencia de artículo encontrada', itemMatch);
        const item: TicketItem = {
          description: itemMatch[2].trim(),
          quantity: parseInt(itemMatch[1], 10),
          price: parseFloat(itemMatch[3].replace(',', '.')),
          establecimiento: this.extractEstablishment(lines),
          fechaUltimaCompra: new Date(), // Fecha actual como fecha de la última compra
          fechaUltimoRetiro: new Date()  // Fecha actual como fecha del último retiro
        };
        await this.findBarcodeForItem(item);

        this.items.push(item);
      } else {
        console.log('No se encontró coincidencia en:', line);
      }
    }

    console.log('Artículos encontrados:', this.items);
    this.updateDatabaseWithItems(this.items);
  }

  extractEstablishment(lines: string[]): string | undefined {
    for (const line of lines) {
      const match = line.match(/(?:Establecimiento|Lugar):\s*(.*)/i);
      if (match) {
        return match[1].trim();
      }
    }
    return 'Desconocido'; // Valor por defecto si no se encuentra el establecimiento
  }

  async updateDatabaseWithItems(items: TicketItem[]) {
    let successfulUploads = 0;

    for (const item of items) {
      try {
        const { exists, id, collectionRef, itemDoc } = await this.firestoreService.checkIfItemExists(item.description);

        if (exists && collectionRef && itemDoc) {
          await this.firestoreService.updateItem(
            collectionRef,
            itemDoc.id,
            item.quantity,
            item.price,
            item.barcode || 'N/A',
            item.establecimiento || 'Desconocido',
            item.fechaUltimaCompra || new Date(),
            item.fechaUltimoRetiro || new Date()
          );
        } else {
          await this.firestoreService.createItem(
            item.description,
            item.quantity,
            item.price,
            item.barcode || 'N/A',
            item.establecimiento || 'Desconocido',
            item.fechaUltimaCompra || new Date(),
            item.fechaUltimoRetiro || new Date()
          );
        }
        successfulUploads++;
      } catch (error) {
        console.error(`Error actualizando o creando el artículo ${item.description}:`, error);
      }
    }

    this.isLoading = false; // Ocultar spinner
    this.successMessage = `El proceso ha finalizado correctamente. Se han subido ${successfulUploads} artículos.`; // Mostrar mensaje de éxito
  }

  async findBarcodeForItem(item: TicketItem) {
    try {
      const response = await this.productService.searchProductsByName(item.description).toPromise();
      const products = response?.products || [];

      if (products.length > 0) {
        const product = products[0];
        item.barcode = product.code;
      }
    } catch (error) {
      console.error(`Error buscando código de barras para ${item.description}:`, error);
    }
  }

  volverAlMain() {
    this.router.navigate(['/main-site']); // Navega al MainSiteComponent
  }
}
