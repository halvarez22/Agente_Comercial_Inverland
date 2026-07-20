import {
  IPropertyCatalog,
  PropertyRecord,
  PropertySearchFilters,
  PropertySearchResult,
  PropertySummary,
} from '../../interfaces/IPropertyCatalog.js';
import { AppConfig } from '../../shared/config/AppConfig.js';
import { logger } from '../../shared/logger/ConsoleLogger.js';

const ACTIVE_OPERATIONS = new Set(['Venta', 'Renta', 'Renta temporal']);

function formatPrice(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

function normalize(text?: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isActiveProperty(property: PropertyRecord): boolean {
  return (
    property.status === 'For Sale' &&
    ACTIVE_OPERATIONS.has(property.operationType) &&
    property.operationType !== 'Desarrollo'
  );
}

function displayPrice(property: PropertyRecord): number {
  if (
    (property.operationType === 'Renta' || property.operationType === 'Renta temporal') &&
    typeof property.rentPrice === 'number' &&
    property.rentPrice > 0
  ) {
    return property.rentPrice;
  }
  return property.price || 0;
}

function toSummary(property: PropertyRecord, matchScore: number, matchNotes: string[]): PropertySummary {
  const price = displayPrice(property);
  return {
    id: property.id,
    title: property.title,
    type: property.type,
    operationType: property.operationType,
    price,
    priceFormatted: property.showPrice === false ? 'Precio a consultar' : formatPrice(price),
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    parkingSpaces: property.parkingSpaces || 0,
    constructionArea: property.constructionArea || 0,
    city: property.city || '',
    neighborhood: property.neighborhood,
    location: property.location || `${property.neighborhood || ''}, ${property.city || ''}`.trim(),
    amenities: Array.isArray(property.amenities) ? property.amenities.slice(0, 8) : [],
    publicUrl: `${AppConfig.portal.propertyBaseUrl}/${property.id}`,
    matchScore,
    matchNotes,
  };
}

function scoreProperty(property: PropertyRecord, filters: PropertySearchFilters): { score: number; notes: string[] } {
  let score = 50;
  const notes: string[] = [];
  const price = displayPrice(property);

  if (filters.operationType) {
    if (property.operationType === filters.operationType) {
      score += 25;
      notes.push('Operación coincide');
    } else {
      score -= 40;
      notes.push(`Operación distinta (${property.operationType})`);
    }
  }

  if (typeof filters.maxPrice === 'number' && filters.maxPrice > 0) {
    if (price > 0 && price <= filters.maxPrice) {
      score += 20;
      notes.push('Dentro de presupuesto');
    } else if (price > 0 && price <= filters.maxPrice * 1.2) {
      score += 8;
      notes.push('Ligeramente arriba del presupuesto');
    } else {
      score -= 15;
      notes.push('Fuera de presupuesto');
    }
  }

  if (typeof filters.minPrice === 'number' && filters.minPrice > 0) {
    if (price >= filters.minPrice) {
      score += 5;
    }
  }

  if (filters.city) {
    if (normalize(property.city).includes(normalize(filters.city)) || normalize(property.location).includes(normalize(filters.city))) {
      score += 15;
      notes.push('Ciudad coincide');
    } else {
      score -= 10;
    }
  }

  if (filters.neighborhood) {
    if (
      normalize(property.neighborhood).includes(normalize(filters.neighborhood)) ||
      normalize(property.location).includes(normalize(filters.neighborhood))
    ) {
      score += 15;
      notes.push('Colonia/zona coincide');
    }
  }

  if (filters.state) {
    if (normalize(property.state).includes(normalize(filters.state))) {
      score += 8;
    }
  }

  if (filters.type) {
    if (normalize(property.type).includes(normalize(filters.type))) {
      score += 15;
      notes.push('Tipo de inmueble coincide');
    } else {
      score -= 8;
    }
  }

  if (typeof filters.bedrooms === 'number' && filters.bedrooms > 0) {
    if ((property.bedrooms || 0) >= filters.bedrooms) {
      score += 10;
      notes.push('Recámaras suficientes');
    } else {
      score -= 8;
    }
  }

  if (typeof filters.bathrooms === 'number' && filters.bathrooms > 0) {
    if ((property.bathrooms || 0) >= filters.bathrooms) {
      score += 5;
    }
  }

  if (typeof filters.parkingSpaces === 'number' && filters.parkingSpaces > 0) {
    if ((property.parkingSpaces || 0) >= filters.parkingSpaces) {
      score += 5;
    }
  }

  return { score: Math.max(0, Math.min(100, score)), notes };
}

export class PropertyMatchingEngine implements IPropertyCatalog {
  constructor(
    private readonly loadActiveProperties: () => Promise<PropertyRecord[]>,
  ) {}

  async getActiveCount(): Promise<number> {
    const active = await this.loadActiveProperties();
    return active.length;
  }

  async getById(id: string): Promise<PropertySummary | null> {
    const active = await this.loadActiveProperties();
    const found = active.find((p) => p.id === id);
    if (!found) {
      logger.info('[PropertyMatchingEngine] Property not active or missing', { id });
      return null;
    }
    return toSummary(found, 100, ['Propiedad activa en stock']);
  }

  async search(filters: PropertySearchFilters): Promise<PropertySearchResult> {
    const limit = Math.min(Math.max(filters.limit || 3, 1), 5);
    const active = await this.loadActiveProperties();

    let pool = active;
    if (filters.operationType) {
      pool = pool.filter((p) => p.operationType === filters.operationType);
    }

    const ranked = pool
      .map((property) => {
        const { score, notes } = scoreProperty(property, filters);
        return { property, score, notes };
      })
      .sort((a, b) => b.score - a.score);

    const exactThreshold = 70;
    const exactMatches = ranked
      .filter((r) => r.score >= exactThreshold)
      .slice(0, limit)
      .map((r) => toSummary(r.property, r.score, r.notes));

    let nearbyAlternatives: PropertySummary[] = [];
    if (exactMatches.length === 0) {
      nearbyAlternatives = ranked
        .slice(0, limit)
        .map((r) => toSummary(r.property, r.score, r.notes));

      // If still empty (e.g. wrong operation filter), broaden to all active
      if (nearbyAlternatives.length === 0 && filters.operationType) {
        const allRanked = active
          .map((property) => {
            const relaxed = { ...filters, operationType: undefined };
            const { score, notes } = scoreProperty(property, relaxed);
            return { property, score, notes: [...notes, 'Alternativa fuera de operación solicitada'] };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
        nearbyAlternatives = allRanked.map((r) => toSummary(r.property, r.score, r.notes));
      }
    }

    const message =
      exactMatches.length > 0
        ? `Encontré ${exactMatches.length} opción(es) activas que coinciden con tu búsqueda.`
        : nearbyAlternatives.length > 0
          ? 'No hay coincidencia exacta en stock activo. Te propongo las alternativas más cercanas disponibles.'
          : 'No hay propiedades activas en el inventario que coincidan ahora. Un asesor humano puede ayudarte a buscar fuera de plataforma.';

    return {
      exactMatches,
      nearbyAlternatives,
      totalActiveInCatalog: active.length,
      filtersApplied: filters,
      message,
    };
  }
}

/** Factory helper used by Firestore / in-memory loaders */
export function filterActiveProperties(raw: PropertyRecord[]): PropertyRecord[] {
  return raw.filter(isActiveProperty);
}
