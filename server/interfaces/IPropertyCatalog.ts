export type PropertyOperationType = 'Venta' | 'Renta' | 'Renta temporal' | 'Desarrollo';

export type PropertyStatus = 'For Sale' | 'Sold' | 'Rented';

export interface PropertyRecord {
  id: string;
  title: string;
  description: string;
  type: string;
  operationType: PropertyOperationType;
  price: number;
  rentPrice?: number;
  showPrice: boolean;
  bedrooms: number;
  bathrooms: number;
  halfBathrooms?: number;
  parkingSpaces: number;
  constructionArea: number;
  landArea?: number;
  country: string;
  state: string;
  city: string;
  neighborhood?: string;
  street: string;
  location: string;
  latitude: number;
  longitude: number;
  images: string[];
  amenities: string[];
  status: PropertyStatus;
  agentId?: string | null;
}

export interface PropertySearchFilters {
  operationType?: 'Venta' | 'Renta' | 'Renta temporal';
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  neighborhood?: string;
  state?: string;
  type?: string;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  limit?: number;
  /** When true, relax filters to find nearest alternatives */
  relaxMatching?: boolean;
}

export interface PropertySummary {
  id: string;
  title: string;
  type: string;
  operationType: string;
  price: number;
  priceFormatted: string;
  bedrooms: number;
  bathrooms: number;
  parkingSpaces: number;
  constructionArea: number;
  city: string;
  neighborhood?: string;
  location: string;
  amenities: string[];
  publicUrl: string;
  matchScore: number;
  matchNotes: string[];
}

export interface PropertySearchResult {
  exactMatches: PropertySummary[];
  nearbyAlternatives: PropertySummary[];
  totalActiveInCatalog: number;
  filtersApplied: PropertySearchFilters;
  message: string;
}

export interface IPropertyCatalog {
  search(filters: PropertySearchFilters): Promise<PropertySearchResult>;
  getById(id: string): Promise<PropertySummary | null>;
  getActiveCount(): Promise<number>;
}
