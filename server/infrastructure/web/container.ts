/**
 * Dependency Injection Container — wires all components together.
 * If Firebase credentials are present → uses Firestore repos.
 * Otherwise → falls back to InMemory repos.
 */
import { GroqProvider } from '../llm/GroqProvider';
import { SolarQuoteEngine } from '../engines/SolarQuoteEngine';
import {
  FirestoreConversationRepository,
  FirestoreLeadRepository,
  InMemoryConversationRepository,
  InMemoryLeadRepository,
} from '../persistence/Repositories';
import { LLMOrchestrator } from '../../application/orchestrators/LLMOrchestrator';
import { ReceiveMessageUseCase } from '../../application/usecases/ReceiveMessageUseCase';
import { SOFIA_DEFINITION } from '../../agents/definitions/Sofia';
import { AppConfig } from '../../shared/config/AppConfig';
import { logger } from '../../shared/logger/ConsoleLogger';

// ─── Infrastructure ────────────────────────────────────────────────────────
const quoteEngine = new SolarQuoteEngine();
const llmProvider = new GroqProvider();

// ─── WhatsApp sender (stateless utility) ───────────────────────────────────
async function sendWhatsAppMessage(phone: string, text: string): Promise<boolean> {
  const { accessToken, phoneNumberId } = AppConfig.meta;
  if (!accessToken || !phoneNumberId) {
    logger.info(`[WhatsApp SIM] → +${phone}: ${text.substring(0, 80)}...`);
    return true;
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    });
    if (!res.ok) {
      const err = await res.json() as any;
      logger.error('[WhatsApp] Send failed', err);
      return false;
    }
    logger.info(`[WhatsApp] Sent to +${phone}`);
    return true;
  } catch (err: any) {
    logger.error('[WhatsApp] Exception', { error: err.message });
    return false;
  }
}

// ─── Repository selection (Firestore vs InMemory) ─────────────────────────
let convRepo: FirestoreConversationRepository | InMemoryConversationRepository;
let leadRepo: FirestoreLeadRepository | InMemoryLeadRepository;

export function initRepositories(db: any | null) {
  if (db) {
    logger.info('[DI] Using Firestore repositories (multi-tenant)');
    convRepo = new FirestoreConversationRepository(db);
    leadRepo = new FirestoreLeadRepository(db);
  } else {
    logger.warn('[DI] Firestore not available — using InMemory repositories');
    convRepo = new InMemoryConversationRepository();
    leadRepo = new InMemoryLeadRepository();
  }
}

// ─── Use Case Factory ─────────────────────────────────────────────────────
export function buildReceiveMessageUseCase(): ReceiveMessageUseCase {
  const orchestrator = new LLMOrchestrator(llmProvider, quoteEngine, leadRepo, convRepo);
  return new ReceiveMessageUseCase(convRepo, orchestrator, SOFIA_DEFINITION, sendWhatsAppMessage);
}

export { convRepo, leadRepo };
