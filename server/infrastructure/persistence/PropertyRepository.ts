import { PropertyRecord } from '../../interfaces/IPropertyCatalog.js';
import { filterActiveProperties } from '../engines/PropertyMatchingEngine.js';
import { logger } from '../../shared/logger/ConsoleLogger.js';

const PROPERTIES_COLLECTION = 'properties';

/** Sample active inventory for local/demo when Firestore is unavailable */
const DEMO_PROPERTIES: PropertyRecord[] = [
  {
    id: 'demo-casa-leon-1',
    title: 'Casa familiar en Jardines del Moral',
    description: 'Casa de dos plantas con jardín y cochera techada, ideal para familia.',
    type: 'Casa',
    operationType: 'Venta',
    price: 3200000,
    showPrice: true,
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 2,
    constructionArea: 180,
    landArea: 220,
    country: 'México',
    state: 'Guanajuato',
    city: 'León',
    neighborhood: 'Jardines del Moral',
    street: 'Calle Nubes',
    location: 'Jardines del Moral, León, Gto.',
    latitude: 21.123,
    longitude: -101.686,
    images: [],
    amenities: ['Jardín', 'Garaje', 'Cocina integral', 'Dos plantas'],
    status: 'For Sale',
  },
  {
    id: 'demo-depto-renta-1',
    title: 'Departamento amueblado zona centro',
    description: 'Departamento en renta cerca de servicios y avenidas principales.',
    type: 'Departamento',
    operationType: 'Renta',
    price: 0,
    rentPrice: 12500,
    showPrice: true,
    bedrooms: 2,
    bathrooms: 1,
    parkingSpaces: 1,
    constructionArea: 85,
    country: 'México',
    state: 'Guanajuato',
    city: 'León',
    neighborhood: 'Centro',
    street: 'Blvd. López Mateos',
    location: 'Centro, León, Gto.',
    latitude: 21.122,
    longitude: -101.682,
    images: [],
    amenities: ['Elevador', 'Seguridad 24 horas', 'Balcón'],
    status: 'For Sale',
  },
  {
    id: 'demo-terreno-1',
    title: 'Terreno residencial en zona de plusvalía',
    description: 'Terreno listo para construir en fraccionamiento privado.',
    type: 'Terreno',
    operationType: 'Venta',
    price: 1850000,
    showPrice: true,
    bedrooms: 0,
    bathrooms: 0,
    parkingSpaces: 0,
    constructionArea: 0,
    landArea: 300,
    country: 'México',
    state: 'Guanajuato',
    city: 'León',
    neighborhood: 'Las Trojes',
    street: 'Camino Real',
    location: 'Las Trojes, León, Gto.',
    latitude: 21.15,
    longitude: -101.7,
    images: [],
    amenities: ['Fraccionamiento privado'],
    status: 'For Sale',
  },
];

function mapDoc(id: string, data: Record<string, unknown>): PropertyRecord {
  return {
    id,
    title: String(data.title || 'Propiedad sin título'),
    description: String(data.description || ''),
    type: String(data.type || ''),
    operationType: (data.operationType as PropertyRecord['operationType']) || 'Venta',
    price: Number(data.price || 0),
    rentPrice: data.rentPrice != null ? Number(data.rentPrice) : undefined,
    showPrice: data.showPrice !== false,
    bedrooms: Number(data.bedrooms || 0),
    bathrooms: Number(data.bathrooms || 0),
    halfBathrooms: data.halfBathrooms != null ? Number(data.halfBathrooms) : undefined,
    parkingSpaces: Number(data.parkingSpaces || 0),
    constructionArea: Number(data.constructionArea || 0),
    landArea: data.landArea != null ? Number(data.landArea) : undefined,
    country: String(data.country || 'México'),
    state: String(data.state || ''),
    city: String(data.city || ''),
    neighborhood: data.neighborhood ? String(data.neighborhood) : undefined,
    street: String(data.street || ''),
    location: String(data.location || ''),
    latitude: Number(data.latitude || 0),
    longitude: Number(data.longitude || 0),
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    amenities: Array.isArray(data.amenities) ? (data.amenities as string[]) : [],
    status: (data.status as PropertyRecord['status']) || 'For Sale',
    agentId: (data.agentId as string | null | undefined) ?? null,
  };
}

export class FirestorePropertyRepository {
  constructor(private db: any) {}

  async getActiveProperties(): Promise<PropertyRecord[]> {
    const snap = await this.db.collection(PROPERTIES_COLLECTION).get();
    const all = snap.docs.map((d: any) => mapDoc(d.id, d.data()));
    const active = filterActiveProperties(all);
    logger.info('[FirestorePropertyRepo] Loaded properties', {
      total: all.length,
      active: active.length,
    });
    return active;
  }
}

export class InMemoryPropertyRepository {
  async getActiveProperties(): Promise<PropertyRecord[]> {
    logger.warn('[InMemoryPropertyRepo] Using demo properties (Firestore unavailable)');
    return filterActiveProperties(DEMO_PROPERTIES);
  }
}
