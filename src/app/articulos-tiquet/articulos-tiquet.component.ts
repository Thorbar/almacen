import { Component, ViewChild, NgZone   } from '@angular/core';
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
  internalCode?: string; // Agrega este campo al modelo
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
  email: string = '';
  
  
  @ViewChild(AlertComponent) alertComponent!: AlertComponent;
  constructor(
    private firestoreService: FirestoreService,
    private productService: ProductService,
    private router: Router,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    const savedLanguage = localStorage.getItem('selectedLanguage');    
    this.selectedLanguage = savedLanguage || 'es';
    this.translate.setDefaultLang(this.selectedLanguage);
    this.translate.use(this.selectedLanguage);

   }
  ngOnInit() {
    // Recuperar el email desde sessionStorage al cargar el componente
    const email = sessionStorage.getItem('userEmail');
    if (email) {
      this.email = email;
      console.log('Email recuperado:', email);
    } else {
      console.error('No se encontró el email en sessionStorage');
    }
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
    this.disableButtons();  // Desactivar todos los botones, incluido el de selección de archivo

    try {
      const worker = await createWorker('spa');
      await worker.reinitialize();
      const image = await this.convertToImage(this.ticketImage);
      const { data: { text } } = await worker.recognize(image);

      this.ocrResult = text.trim();
      this.ocrResult = this.ocrResult.replace(/(\d),(\d)/g, '$1.$2');
      console.log('Texto del tiquet:', this.ocrResult);

      if (!this.ocrResult) {
        const confirmMessage = this.translate.instant('TICKET_PROCESSING_ERROR');
        this.alertComponent.showAlerts(confirmMessage, 'error');
        this.isLoading = false;  // Spinner se detiene si falla el OCR
        setTimeout(() => {
          this.alertComponent.cancel();  // Oculta el mensaje después del tiempo especificado
          this.enableButtons();  // Reactivar todos los botones
        }, 2500);
        return;
      }

      // Extraer el establecimiento
      const establishmentRaw = this.extractEstablishment(this.ocrResult.split('\n'));
      const establishment = this.cleanSupermarketName(establishmentRaw);

      // Procesar directamente sin confirmar al usuario
      if (establishment === 'OTROS_SUPERMERCADOS' || establishment === 'OTROSSUPERMERCADOS' || !establishment) {
        console.log('El tiquet no se puede procesar porque el establecimiento no es válido.');

        setTimeout(() => {
          const confirmMessage = 'El tiquet no se puede procesar porque el establecimiento no es válido.';
          this.alertComponent.showAlerts(confirmMessage, 'error');
          this.isLoading = false;  // Detener el spinner ya que no se subirá nada

          // Mostrar el mensaje de error y limpiar los datos después de 2.5 segundos
          setTimeout(() => {
            this.alertComponent.cancel();  // Oculta el mensaje después del tiempo especificado          
            this.clearProcessedData();     // Limpiar la pantalla
            this.enableButtons();
          }, 2500);
        }, 0);  // Usamos setTimeout para forzar la detección de cambios
      } else {
        // Si el establecimiento es válido, continúa con el proceso de subida
        this.isLoading = true;  // Spinner vuelve a girar
        await this.processTicketData(establishment);  // Procesar los datos del tiquet
      }

    } catch (error) {
      console.error('Error procesando el OCR:', error);
      this.isLoading = false;
      this.enableButtons();
    }
    this.isLoading = false;
  }

  // Método para desactivar los botones mientras se procesa el tiquet
  disableButtons() {
    this.isFileUpload = false;
    this.isCameraCapture = false;
    
      // Desactivar botón de selección de archivo si está visible
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      console.log('fileInput');
      fileInput.disabled = true; // Desactivar el botón de selección de archivo
    }
  }

  // Método para habilitar los botones
  enableButtons() {
    this.isFileUpload = true;
    this.isCameraCapture = true;
      // Reactivar botón de selección de archivo si está visible
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.disabled = false; // Reactivar el botón de selección de archivo
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
        const confirmMessage = `TICKET_READ_ERROR`;
        this.alertComponent.showAlerts(confirmMessage, 'warning');
        // Esperar 2.5 segundos para limpiar la pantalla
        setTimeout(() => {
          this.alertComponent.cancel(); // Oculta el mensaje después del tiempo especificado
          this.clearProcessedData();    // Limpia la pantalla (imagen, OCR, artículos)
        });
        this.alertComponent.showAlerts(confirmMessage, 'warning');
        return; // Evitar continuar el procesamiento si no se define el patrón
      }
    console.log('Email recuperado 2:', this.email);

    // Verificar si tenemos un email válido antes de proceder
    if (!this.email) {
      const errorMessage = this.translate.instant('EMAIL_MISSING_ERROR');
      this.alertComponent.showAlerts(errorMessage, 'error');
      return;
    }

    const collectionRef = this.firestoreService.getOrCreateCollection(this.email);

    // Procesamos cada línea del OCR según el patrón del establecimiento
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
            price: parseFloat(itemMatch[3].replace('', '.')), // Precio unitario
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
        item.internalCode = this.generateInternalCode(item); // Genera el código solo si no existe

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
            item.fechaUltimaCompra || new Date(),
            item.internalCode
          );
        }
        successfulUploads++;
      } catch (error) {
        console.error(`Error actualizando o creando el artículo ${item.description}:`, error);
      }
    }

    this.isLoading = false; // Spinner detenido
    console.log(`El proceso ha finalizado correctamente. Se han subido ${successfulUploads} artículos.`);

    // Mostrar el mensaje de éxito
    const confirmMessage = `PROCESS_COMPLETED_SUCCESS ${successfulUploads} ITEMS`;
    this.alertComponent.showAlerts(confirmMessage, 'success');

    // Esperar 2.5 segundos antes de limpiar los datos
    setTimeout(() => {
      this.alertComponent.cancel();  // Ocultar el mensaje      
    });
    this.clearProcessedData();     // Limpiar la pantalla después de que desaparezca el mensaje
}

  // Función para generar un código interno único para el artículo
  private generateInternalCode(item: TicketItem): string {
    // Se puede generar un código basado en el nombre del artículo y un valor aleatorio o timestamp
    const timestamp = new Date().getTime();  // Obtiene la hora actual en milisegundos
    const randomPart = Math.floor(Math.random() * 10000); // Genera una parte aleatoria
    const code = `${item.description.substring(0, 3).toUpperCase()}-${timestamp}-${randomPart}`;

    return code;
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
