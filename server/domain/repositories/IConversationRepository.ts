import { Conversation } from '../entities/Conversation';

export interface IConversationRepository {
  findByPhone(tenantId: string, phone: string): Promise<Conversation>;
  save(conversation: Conversation): Promise<void>;
  findAll(tenantId: string): Promise<Conversation[]>;
}
