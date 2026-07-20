// ──────────────────────────────────────────────
// DOMAIN ENTITIES
// ──────────────────────────────────────────────

export type ConversationPhase =
  | 'GREETING'
  | 'QUALIFICATION'
  | 'TECHNICAL_SURVEY'
  | 'QUOTATION'
  | 'SEARCH'
  | 'FINANCING'
  | 'CLOSING'
  | 'LEAD_GENERATED'
  | 'HUMAN_HANDOFF';

export interface ConversationState {
  phase: ConversationPhase;
  completedSteps: string[];
  missingFields: string[];
  leadScore: number;       // 0–100
  intent?: string;
  clientName?: string;
  operationType?: string;
  budgetMax?: number;
  preferredZones?: string;
  propertyType?: string;
  bedrooms?: number;
  matchedPropertyIds?: string[];
  // Legacy solar fields (backward compat)
  monthlyBill?: number;
  isOwner?: boolean;
  roofType?: string;
  hasShade?: boolean;
  voltage?: string;
  floors?: number;
}

export interface Message {
  sender: 'user' | 'bot' | 'agent';
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  tenantId: string;
  phone: string;
  nombre: string;
  botDisabled: boolean;
  messages: Message[];
  state: ConversationState;
  lastMessageAt: string;
  createdAt: string;
  // Display fields for dashboard
  montoRecibo?: string;       // budget display
  sistemaEstimado?: string;   // matched property / interest summary
  costoEstimado?: string;
  operationType?: string;
  preferredZones?: string;
}
