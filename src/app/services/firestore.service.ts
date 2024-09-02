import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentReference, DocumentData } from '@angular/fire/compat/firestore'; // Asegúrate de tener la librería de Firebase instalada
import { Observable } from 'rxjs';

interface TicketItem {
  description: string;
  quantity: number;
  price: number;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  private collections = [
    'Productos_Congelado',
    'Productos_Fresco',
    'Productos_Seco',
    'Productos_Limpieza',
    'Productos_Tiquet' // Añadido para productos que no se encuentran en las colecciones anteriores
  ];

  constructor(private firestore: AngularFirestore) { }

  async checkIfItemExists(description: string): Promise<any> {
    try {
      const collectionRef = this.getCollectionByDescription(description);
      const snapshot = await collectionRef.ref.where('descripcion', '==', description).limit(1).get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { exists: true, id: doc.id, data: doc.data() };
      } else {
        return { exists: false };
      }
    } catch (error) {
      console.error('Error al verificar si el artículo existe:', error);
      throw error;
    }
  }
  getCollectionByDescription(description: string): AngularFirestoreCollection<DocumentData> {
    if (description.toLowerCase().includes('congelado')) {
      return this.firestore.collection('Productos_Congelado');
    } else if (description.toLowerCase().includes('fresco')) {
      return this.firestore.collection('Productos_Fresco');
    } else if (description.toLowerCase().includes('limpieza')) {
      return this.firestore.collection('Productos_Limpieza');
    } else {
      return this.firestore.collection('Productos_Seco');
    }
  }


  /* async checkIfItemExists(description: string): Promise<{ exists: boolean, collection: string | null, itemDoc: any | null }> {
 
     for (const collectionName of this.collections) {
       const itemsCollection = this.firestore.collection(collectionName, ref => ref.where('descripcion', '==', description));
       const snapshot = await itemsCollection.get().toPromise();
 
       if (!snapshot.empty) {
         return { exists: true, collection: collectionName, itemDoc: snapshot.docs[0] };
       }
     }
     return { exists: false, collection: null, itemDoc: null };
   }*/

  async updateItem(collection: string, itemDoc: any, quantity: number, price: number): Promise<void> {
    const docRef = itemDoc.ref;
    const existingData = itemDoc.data();
    const updatedData = {
      cantidadStock: (existingData.cantidadStock || 0) + quantity,
      precio: price,
      fechaUltimaCompra: new Date()
    };
    await docRef.update(updatedData);
    console.log(`Artículo actualizado en ${collection}:`, updatedData);
  }

  async createItem(item: any): Promise<DocumentReference<DocumentData>> {
    const newItem = {
      descripcion: item.description,
      cantidadStock: item.quantity,
      precio: item.price,
      establecimiento: 'Desconocido', // Puedes cambiar esto según sea necesario
      fechaCreacion: new Date(),
      fechaUltimaCompra: new Date(),
      fechaUltimoRetiro: null,
      id: this.firestore.createId(), // Puedes modificar la lógica para generar IDs si es necesario
      codigo: '' // Si no hay código disponible
    };

    const collectionRef = this.firestore.collection('Productos_Tiquet');
    const docRef = await collectionRef.add(newItem);
    console.log('Nuevo artículo creado en Productos_Tiquet:', newItem);
    return docRef as DocumentReference<DocumentData>;
  }
}
