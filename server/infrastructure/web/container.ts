/**
 * Dependency Injection Container — wires all components together.
 * If Firebase credentials are present → uses Firestore repos.
 * Otherwise → falls back to InMemory repos + demo properties.
 */
import { GroqProvider } from '../llm/GroqProvider.js';
import { PropertyMatchingEngine } from '../engines/PropertyMatchingEngine.js';
import {
  FirestoreConversationRepository,
  FirestoreLeadRepository,
  InMemoryConversationRepository,
  InMemoryLeadRepository,
} from '../persistence/Repositories.js';
import {
  FirestorePropertyRepository,
  InMemoryPropertyRepository,
} from '../persistence/PropertyRepository.js';
import { LLMOrchestrator } from '../../application/orchestrators/LLMOrchestrator.js';
import { ReceiveMessageUseCase } from '../../application/usecases/ReceiveMessageUseCase.js';
import { LeadSyncService } from '../../application/services/LeadSyncService.js';
import { SOFIA_DEFINITION } from '../../agents/definitions/Sofia.js';
import { AppConfig } from '../../shared/config/AppConfig.js';
import { logger } from '../../shared/logger/ConsoleLogger.js';
import { getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const llmProvider = new GroqProvider();

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
        text: { preview_url: true, body: text },
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

function getFirestoreDb(): any | null {
  try {
    if (getApps().length > 0) {
      return getFirestore();
    }
  } catch (e: any) {
    logger.warn('[DI] Could not get Firestore', { error: e.message });
  }
  return null;
}

function getRepos(db: any | null) {
  if (db) {
    logger.info('[DI] Using Firestore repositories (multi-tenant)');
    return {
      convRepo: new FirestoreConversationRepository(db),
      leadRepo: new FirestoreLeadRepository(db),
    };
  }
  logger.warn('[DI] Firestore not available — using InMemory repositories');
  return {
    convRepo: new InMemoryConversationRepository(),
    leadRepo: new InMemoryLeadRepository(),
  };
}

function buildPropertyCatalog(db: any | null) {
  if (db) {
    const repo = new FirestorePropertyRepository(db);
    return new PropertyMatchingEngine(() => repo.getActiveProperties());
  }
  const repo = new InMemoryPropertyRepository();
  return new PropertyMatchingEngine(() => repo.getActiveProperties());
}

let _convRepo: FirestoreConversationRepository | InMemoryConversationRepository | undefined;
let _leadRepo: FirestoreLeadRepository | InMemoryLeadRepository | undefined;
let _db: any | null = null;

export function initRepositories(db: any | null) {
  _db = db;
  if (db) {
    logger.info('[DI] initRepositories: Using Firestore repositories (multi-tenant)');
    _convRepo = new FirestoreConversationRepository(db);
    _leadRepo = new FirestoreLeadRepository(db);
  } else {
    logger.warn('[DI] initRepositories: Firestore not available — using InMemory repositories');
    _convRepo = new InMemoryConversationRepository();
    _leadRepo = new InMemoryLeadRepository();
  }
}

export function buildReceiveMessageUseCase(): ReceiveMessageUseCase {
  const db = _db ?? getFirestoreDb();
  const repos =
    _convRepo && _leadRepo
      ? { convRepo: _convRepo, leadRepo: _leadRepo }
      : getRepos(db);

  const propertyCatalog = buildPropertyCatalog(db);
  const leadSync = new LeadSyncService(db, (lead) => repos.leadRepo.save(lead), sendWhatsAppMessage);
  const orchestrator = new LLMOrchestrator(
    llmProvider,
    propertyCatalog,
    repos.leadRepo,
    repos.convRepo,
    leadSync,
  );
  return new ReceiveMessageUseCase(repos.convRepo, orchestrator, SOFIA_DEFINITION, sendWhatsAppMessage);
}

export { _convRepo as convRepo, _leadRepo as leadRepo, sendWhatsAppMessage };
