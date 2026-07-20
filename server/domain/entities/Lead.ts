export interface Lead {
  id: string;
  tenantId: string;
  phone: string;
  nombre: string;
  /** Operation interest: Venta | Renta | Renta temporal */
  operationType?: string;
  /** Budget as human-readable string e.g. "$2,500,000 MXN" */
  budget?: string;
  preferredZones?: string;
  propertyType?: string;
  matchedPropertyIds?: string[];
  matchedPropertyTitles?: string;
  /** @deprecated solar — kept for backward compat with old docs */
  montoRecibo?: string;
  /** Preferred property summary / interest summary */
  sistemaEstimado?: string;
  costoEstimado?: string;
  roiAnios?: string;
  leadScore: number;
  status: 'pending_review' | 'contacted' | 'closed_won' | 'closed_lost';
  notasTecnicas?: string;
  privateNotes?: string;
  portalClientId?: string;
  createdAt: string;
}
