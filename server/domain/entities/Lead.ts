export interface Lead {
  id: string;
  tenantId: string;
  phone: string;
  nombre: string;
  montoRecibo: string;
  sistemaEstimado: string;
  costoEstimado: string;
  roiAnios?: string;
  leadScore: number;
  status: 'pending_review' | 'contacted' | 'closed_won' | 'closed_lost';
  notasTecnicas?: string;
  privateNotes?: string;
  createdAt: string;
}
