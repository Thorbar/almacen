import { Component } from '@angular/core';
import { Router } from '@angular/router'; // Importa el Router

import Tesseract from 'tesseract.js';
import { createWorker, Worker } from 'tesseract.js'; // Importamos el tipo Worker
import { FirestoreService } from '../services/firestore.service';


interface TicketItem {
  description: string;
  quantity: number;
  price: number;
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

  constructor(private firestoreService: FirestoreService,
    private router: Router
  ) { }




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
  /*
    processTicket() {
      if (this.ticketImage) {
        console.log('Procesando tiquet con OCR...');
        Tesseract.recognize(this.ticketImage as string, 'eng', {
          logger: m => console.log(m)
        })
        .then(({ data: { text } }) => {
          this.ocrResult = text;
          console.log('Resultado OCR:', text);
          // Aquí podemos proceder a procesar el texto extraído.
        })
        .catch((err) => {
          console.error('Error durante el proceso de OCR:', err);
        });
      } else {
        console.log('No se ha seleccionado ninguna imagen.');
      }
    }*/

  async processTicket() {
    if (!this.ticketImage) {
      console.log('No se ha cargado ninguna imagen de tiquet.');
      return;
    }

    try {
      const worker = await createWorker('spa'); // Esperamos a que el worker sea creado
      await worker.reinitialize();
      // Convertir ticketImage a HTMLImageElement o Canvas
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

  processTicketData() {
    const lines = this.ocrResult.split('\n');
    this.items = [];

    const itemPattern = /^(\d+)\s+(.+?)\s+([\d,]+(?:\.\d{2})?)$/;


    lines.forEach(line => {
      const match = line.match(itemPattern);

      if (match) {
        console.log('Coincidencia encontrada', match);
        const item = {
          description: match[2].trim(), // Descripción del producto
          quantity: parseInt(match[1], 10), // La cantidad es el primer grupo
          price: parseFloat(match[3].replace(',', '.')) // El precio es el tercer grupo, convertir ',' a '.'
        };
        this.items.push(item);
      } else {
        console.log('No se encontró coincidencia en:', line);
      }
    });

    console.log('Artículos encontrados:', this.items);
    // Llamada a la función para actualizar o crear artículos en la base de datos
    this.updateDatabaseWithItems(this.items);
  }
  async updateDatabaseWithItems(items: TicketItem[]) {
    for (const item of items) {
      try {
        const { exists, collection, itemDoc } = await this.firestoreService.checkIfItemExists(item.description);

        if (exists && collection && itemDoc) {
          await this.firestoreService.updateItem(collection, itemDoc, item.quantity, item.price);
        } else {
          await this.firestoreService.createItem(item);
        }
      } catch (error) {
        console.error(`Error actualizando o creando el artículo ${item.description}:`, error);
      }
    }
  }

  volverAlMain() {
    this.router.navigate(['/main-site']); // Navega al MainSiteComponent
  }
}
