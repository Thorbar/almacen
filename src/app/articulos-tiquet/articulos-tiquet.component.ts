import { Component, ViewChild  } from '@angular/core';
import { Router } from '@angular/router';
import Tesseract from 'tesseract.js';
import { createWorker } from 'tesseract.js';
import { FirestoreService } from '../services/firestore.service';
import { ProductService } from '../services/product.service';
import { AlertComponent } from '../alert/alert.component';
import { TranslateService } from '@ngx-translate/core';
import { ChangeDetectorRef } from '@angular/core';


interface TicketItem {
  description: string;
  quantity: number;
  price: number;
  barcode?: string;
  establecimiento?: string;
  fechaCracion?: Date;
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
  selectedLanguage: string = 'es'; // Declara la propiedad aquí
  items: TicketItem[] = [];
  isLoading: boolean = false;
  isConfirmingEstablishment: boolean = false; // Añadimos esta propiedad para controlar el estado del spinner
  successMessage: string = ''; // Nuevo campo para almacenar el mensaje de éxito
  isFileUpload = false;
  isCameraCapture = false;
  selectedFileName: string = ''; // Nombre del archivo seleccionado
  
  
  @ViewChild(AlertComponent) alertComponent!: AlertComponent;

  constructor(
    private firestoreService: FirestoreService,
    private productService: ProductService,
    private router: Router,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef 
  ) {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    this.selectedLanguage = savedLanguage || 'es';
    this.translate.setDefaultLang(this.selectedLanguage);
    this.translate.use(this.selectedLanguage);

   }

   cleanSupermarketName(name: string): string {
    // Reemplazamos caracteres como comas, guiones y espacios adicionales
    return name.replace(/[^a-zA-Z\s]/g, '').trim().toUpperCase();
  }
  

  selectFileMethod() {
    this.isFileUpload = true;
    this.isCameraCapture = false;
  }
  captureImageMethod() {
    this.isFileUpload = false;
    this.isCameraCapture = true;
  }

  // Método que se activa cuando se selecciona un archivo
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name; // Almacena el nombre del archivo seleccionado
      const reader = new FileReader();
      reader.onload = e => {
        this.ticketImage = reader.result;
        this.ocrResult = ''; // Limpiar el resultado anterior cuando se selecciona una nueva imagen
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedFileName = 'Ningún archivo seleccionado';
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
      const confirmMessage = this.translate.instant('MUST_UPLOAD_IMAGE');
      this.alertComponent.showAlerts(confirmMessage, 'warning');
      setTimeout(() => this.alertComponent.cancel(), 2500);
      return;
    }
  
    this.isLoading = true;  // Spinner empieza a girar
  
    try {
      const worker = await createWorker('spa');
      await worker.reinitialize();
      const image = await this.convertToImage(this.ticketImage);
      const { data: { text } } = await worker.recognize(image);
  
      this.ocrResult = text.trim();
      console.log('Texto del tiquet:', this.ocrResult);
  
      if (!this.ocrResult) {
        this.alertComponent.showAlerts('No se pudo procesar el tiquet. Intente nuevamente.', 'error');
        this.isLoading = false;  // Spinner se detiene si falla el OCR
        return;
      }
  
      // Extraer el establecimiento
      const establishmentRaw = this.extractEstablishment(this.ocrResult.split('\n'));
      const establishment = this.cleanSupermarketName(establishmentRaw);
      const confirmMessage = `¿Se detectó correctamente el establecimiento como ${establishment}?`;

      this.isConfirmingEstablishment = true; // Congelar el spinner mientras aparece el mensaje  
      // Mantener el spinner visible pero congelado
      this.alertComponent.showAlerts(confirmMessage, 'confirm');

  
      const confirmSubscription = this.alertComponent.onConfirm.subscribe(async () => {
        this.isConfirmingEstablishment = false; // Reanudar el spinner
        // Spinner vuelve a girar al confirmar
        this.isLoading = true;
        await this.processTicketData(establishment);
        confirmSubscription.unsubscribe();
      });
  
      const cancelSubscription = this.alertComponent.onCancel.subscribe(() => {
        this.isConfirmingEstablishment = false;
       // this.alertComponent.cancel();
        cancelSubscription.unsubscribe();
        this.isLoading = false;  // Spinner se detiene si se cancela
      });
  
    } catch (error) {
      console.error('Error procesando el OCR:', error);
      this.isLoading = false;
    }
  }
  
  
  

  // Método para desactivar los botones mientras se procesa el tiquet
  disableButtons() {
    this.isFileUpload = false;
    this.isCameraCapture = false;
  }

  // Método para habilitar los botones
  enableButtons() {
    this.isFileUpload = true;
    this.isCameraCapture = true;
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
  
  async processTicketData(establishment: string) {
    const lines = this.ocrResult.split('\n');
    this.items = [];
    
    let itemPattern: RegExp | undefined;
  
    // Ajustamos el patrón según el establecimiento
    if (establishment === 'MERCADONA') {
      // Mercadona: cantidad + descripción + precio
      itemPattern = /^(\d+)\s+(.+?)\s+([\d,]+(?:\.\d{2})?)$/;
    } else if (establishment === 'CARREFOUR' || establishment === 'CONDIS' || establishment === 'BON PREU') {
      // Carrefour/Condis/Bon Preu: descripción + precio (y cantidad opcional en la línea siguiente)
      itemPattern = /^(.+?)\s+([\d,]+(?:\.\d{2})?)$/;
    } else if (establishment === 'LIDL') {
      // Lidl: descripción + precio/unidad + cantidad + precio total
      itemPattern = /^(.+?)\s+([\d,]+(?:\.\d{2})?)\s+(\d+)\s+([\d,]+(?:\.\d{2})?)$/;
    } else if (establishment === 'AMETLLER') {
      // Ametller: descripción + cantidad + precio/unidad + precio total
      itemPattern = /^(.+?)\s+(\d+|\d+\.\d+)\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)$/;
    }
      // Si el patrón no se definió, podemos usar un patrón por defecto o evitar el procesamiento.
      if (!itemPattern) {
        this.alertComponent.showAlerts('El tiquet no se puede leer correctamente, vuelva a subir una imagen.', 'error');
        
        // Esperar 2.5 segundos para limpiar la pantalla
        setTimeout(() => {
          this.alertComponent.cancel(); // Oculta el mensaje después del tiempo especificado
          this.clearProcessedData();    // Limpia la pantalla (imagen, OCR, artículos)
        }, 2500);
        
        return; // Evitar continuar el procesamiento si no se define el patrón
      }
  
    const collectionRef = this.firestoreService.getOrCreateCollection(establishment);
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Verificamos si el patrón es válido
      let itemMatch = itemPattern ? line.match(itemPattern) : null;

      if (itemMatch) {
        console.log('Coincidencia de artículo encontrada:', itemMatch);
  
        let item: TicketItem = {
          description: '',
          quantity: 1,
          price: 0,
          establecimiento: establishment,
          fechaUltimaCompra: new Date(),
        }; // Inicialización básica de item
  
        if (establishment === 'MERCADONA') {
          // Para Mercadona: cantidad + descripción + precio
          item = {
            description: itemMatch[2].trim(),
            quantity: parseInt(itemMatch[1], 10),
            price: parseFloat(itemMatch[3].replace(',', '.')), // Precio unitario
            establecimiento: establishment,
            fechaUltimaCompra: new Date(),
          };
        } else if (establishment === 'CARREFOUR' || establishment === 'CONDIS' || establishment === 'BON PREU') {
          // Para Carrefour/Condis/Bon Preu: descripción + precio y cantidad opcional en la siguiente línea
          item = {
            description: itemMatch[1].trim(),
            quantity: 1, // Por defecto 1, revisaremos si hay una línea de cantidad debajo
            price: parseFloat(itemMatch[2].replace(',', '.')), // Precio unitario
            establecimiento: establishment,
            fechaUltimaCompra: new Date(),
          };
  
          // Verificamos si la siguiente línea tiene la cantidad (por ejemplo "8" debajo de "FANTA NARANJA LATA")
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            const quantityMatch = nextLine.match(/^\d+$/); // Verificamos si la línea siguiente es un número (cantidad)
            if (quantityMatch) {
              item.quantity = parseInt(quantityMatch[0], 10); // Actualizamos la cantidad
              i++; // Saltamos la línea de cantidad
            }
          }
        } else if (establishment === 'LIDL') {
          // Para Lidl: descripción + precio/unidad + cantidad + precio total
          item = {
            description: itemMatch[1].trim(),
            quantity: parseInt(itemMatch[3], 10),
            price: parseFloat(itemMatch[2].replace(',', '.')), // Precio unitario
            establecimiento: establishment,
            fechaUltimaCompra: new Date(),
          };
        } else if (establishment === 'AMETLLER') {
          // Para Ametller: descripción + cantidad + precio/unidad + precio total
          item = {
            description: itemMatch[1].trim(),
            quantity: parseFloat(itemMatch[2]), // Puede ser en peso (ej. 1.5 kg)
            price: parseFloat(itemMatch[3].replace(',', '.')), // Precio unitario
            establecimiento: establishment,
            fechaUltimaCompra: new Date(),
          };
        }
  
        await this.findBarcodeForItem(item); // Buscar el código de barras si es necesario
        this.items.push(item);
      } else {
        console.log('No se encontró coincidencia en:', line);
      }
    }
  
    console.log('Artículos encontrados:', this.items);
    this.updateDatabaseWithItems(this.items, collectionRef);
    // Limpiar tiquet, OCR y artículos al finalizar el proceso
  }  


  extractEstablishment(lines: string[]): string {    
    for (const line of lines) {
      const cleanLine = line.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
      console.log('Línea procesada:', cleanLine); // Para depuración
  
      // Comprobar si la línea contiene el nombre del supermercado
      if (cleanLine.includes('MERCADONA')) {
        console.log('Super encontrado:', cleanLine);
        return 'MERCADONA'; // Si encontramos "MERCADONA", devolvemos el nombre limpio
      }
      else if (cleanLine.includes('CARREFOUR')) {
        console.log('Super encontrado:', cleanLine);
        return 'CARREFOUR'; // Si encontramos "MERCADONA", devolvemos el nombre limpio
      } else if (cleanLine.includes('BON PREU')) {
        return 'BON PREU';
      } else if (cleanLine.includes('LIDL')) {
        return 'LIDL';
      } else if (cleanLine.includes('CONDIS')) {
        return 'CONDIS';
      }
    }
    return 'OTROS_SUPERMERCADOS';
  }
  
  
  async updateDatabaseWithItems(items: TicketItem[], collectionRef: any) {
    let successfulUploads = 0;

    for (const item of items) {
      try {
        const { exists, id, itemDoc } = await this.firestoreService.checkIfItemExists(item.description);

        if (exists && itemDoc) {
          await this.firestoreService.updateItem(
            collectionRef,
            itemDoc.id,
            item.quantity,
            item.price,
            item.barcode || 'N/A',
            item.establecimiento || 'Desconocido',
            item.fechaUltimaCompra || new Date()
          );
        } else {
          await this.firestoreService.createItem(
            collectionRef,
            item.description,
            item.quantity,
            item.price,
            item.barcode || 'N/A',
            item.establecimiento || 'Desconocido',
            item.fechaUltimaCompra || new Date()
          );
        }
        successfulUploads++;
      } catch (error) {
        console.error(`Error actualizando o creando el artículo ${item.description}:`, error);
      }
    }

    this.isLoading = false; // Spinner detenido

    // Mostrar el mensaje de éxito
    this.alertComponent.showAlerts(`El proceso ha finalizado correctamente. Se han subido ${successfulUploads} artículos.`, 'success');

    // Esperar 2.5 segundos antes de limpiar los datos
    setTimeout(() => {
      this.alertComponent.cancel();  // Ocultar el mensaje      
    }, 2500);
    this.clearProcessedData();     // Limpiar la pantalla después de que desaparezca el mensaje
}


  clearProcessedData() {
    // Limpia la imagen del tiquet, el resultado OCR y los artículos
    this.ticketImage = null;
    this.ocrResult = '';
    this.items = [];
    
    // Resetear la selección de archivo
    this.selectedFileName = '';  // Reiniciar el nombre del archivo seleccionado
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';  // Limpiar el valor del campo de selección de archivo
    }
    // Asegurarse de que Angular detecte los cambios para que actualice la vista
    this.cdr.detectChanges();
  }

  async findBarcodeForItem(item: TicketItem) {
    try {
      const response = await this.productService.searchProductsByName(item.description).toPromise();
      const products = response?.products || [];

      if (products.length > 0) {
        const product = products[0];
        item.barcode = product.code || '';
      }
    } catch (error) {
      console.error(`Error buscando código de barras para ${item.description}:`, error);
    }
  }

  volverAlMain() {
    this.router.navigate(['/main-site']); // Navega al MainSiteComponent
  }
}