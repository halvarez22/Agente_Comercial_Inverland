/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Message {
  sender: 'user' | 'bot' | 'agent';
  text: string;
  timestamp: string; // ISO String for uniform parsing
}

export interface Chat {
  id: string; // Phone number as ID
  phone: string;
  nombre?: string;
  botDisabled: boolean;
  /** Budget / presupuesto display */
  montoRecibo?: string;
  /** Matched property or interest summary */
  sistemaEstimado?: string;
  costoEstimado?: string;
  operationType?: string;
  preferredZones?: string;
  lastMessageAt: string;
  messages: Message[];
}

export interface QualifiedLead {
  id: string;
  nombre: string;
  phone: string;
  operationType?: string;
  budget?: string;
  preferredZones?: string;
  propertyType?: string;
  matchedPropertyIds?: string[];
  matchedPropertyTitles?: string;
  /** Budget display (compat) */
  montoRecibo?: string;
  /** Interest / property summary */
  sistemaEstimado?: string;
  costoEstimado?: string;
  leadScore?: number;
  status: 'pending_review' | 'contacted';
  createdAt: string;
  privateNotes?: string;
  notasTecnicas?: string;
}
