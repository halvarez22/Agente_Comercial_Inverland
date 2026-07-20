import { ILLMProvider, LLMMessage, ToolDefinition } from '../../interfaces/ILLMProvider.js';
import { IPropertyCatalog } from '../../interfaces/IPropertyCatalog.js';
import { ILeadRepository } from '../../domain/repositories/ILeadRepository.js';
import { IConversationRepository } from '../../domain/repositories/IConversationRepository.js';
import { Conversation } from '../../domain/entities/Conversation.js';
import { Lead } from '../../domain/entities/Lead.js';
import { LeadScore, Money } from '../../domain/value_objects/index.js';
import { AgentDefinition } from '../../interfaces/IAgentFactory.js';
import { LeadSyncService } from '../services/LeadSyncService.js';
import { logger } from '../../shared/logger/ConsoleLogger.js';
import { AppConfig } from '../../shared/config/AppConfig.js';
import { SOFIA_TOOLS } from '../../agents/definitions/Sofia.js';

const MAX_TOOL_ROUNDS = 5;

export class LLMOrchestrator {
  constructor(
    private llm: ILLMProvider,
    private propertyCatalog: IPropertyCatalog,
    private leadRepo: ILeadRepository,
    private convRepo: IConversationRepository,
    private leadSync: LeadSyncService,
  ) {}

  async run(
    agent: AgentDefinition,
    conversation: Conversation,
    userText: string,
  ): Promise<{ replyText: string; updatedConversation: Conversation; leadGenerated: boolean }> {
    const userMsg = { sender: 'user' as const, text: userText, timestamp: new Date().toISOString() };
    conversation.messages.push(userMsg);

    const history: LLMMessage[] = conversation.messages.slice(-20).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    const messages: LLMMessage[] = [
      { role: 'system', content: agent.systemPrompt },
      ...history,
    ];

    let leadGenerated = false;
    let finalText = '';

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await this.llm.complete(messages, this._buildTools(), AppConfig.groq.temperature);

      if (response.finishReason === 'stop') {
        finalText = response.text || '';
        break;
      }

      if (response.finishReason === 'tool_calls') {
        messages.push({
          role: 'assistant',
          content: JSON.stringify({ tool_calls: response.toolCalls }),
        });

        for (const toolCall of response.toolCalls) {
          logger.info(`[LLMOrchestrator] Tool called: ${toolCall.name}`, toolCall.arguments);
          const toolResult = await this._executeTool(toolCall.name, toolCall.arguments, conversation);

          if (toolCall.name === 'registrar_prospecto_calificado') {
            leadGenerated = true;
            await this._saveLeadAndNotify(toolCall.arguments as Record<string, unknown>, conversation);
          }

          messages.push({
            role: 'tool',
            name: toolCall.name,
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }
        continue;
      }
    }

    if (!finalText) {
      finalText =
        'Tuve un problema técnico. Un asesor de InverLand te contactará pronto. También puedes escribir al +52 479 216 1683. 🙏';
    }

    conversation.messages.push({ sender: 'bot', text: finalText, timestamp: new Date().toISOString() });
    conversation.lastMessageAt = new Date().toISOString();
    if (leadGenerated) conversation.state.phase = 'LEAD_GENERATED';

    return { replyText: finalText, updatedConversation: conversation, leadGenerated };
  }

  private _buildTools(): ToolDefinition[] {
    return SOFIA_TOOLS;
  }

  private async _executeTool(
    name: string,
    args: Record<string, unknown>,
    conv: Conversation,
  ): Promise<unknown> {
    if (name === 'buscar_propiedades') {
      const filters = {
        operationType: args.operation_type as 'Venta' | 'Renta' | 'Renta temporal' | undefined,
        maxPrice: typeof args.max_price === 'number' ? args.max_price : undefined,
        minPrice: typeof args.min_price === 'number' ? args.min_price : undefined,
        city: args.city ? String(args.city) : undefined,
        neighborhood: args.neighborhood ? String(args.neighborhood) : undefined,
        state: args.state ? String(args.state) : undefined,
        type: args.property_type ? String(args.property_type) : undefined,
        bedrooms: typeof args.bedrooms === 'number' ? args.bedrooms : undefined,
        bathrooms: typeof args.bathrooms === 'number' ? args.bathrooms : undefined,
        parkingSpaces: typeof args.parking_spaces === 'number' ? args.parking_spaces : undefined,
        limit: typeof args.limit === 'number' ? args.limit : 3,
        relaxMatching: true,
      };

      const result = await this.propertyCatalog.search(filters);
      conv.state.phase = 'SEARCH';
      if (filters.operationType) {
        conv.state.operationType = filters.operationType;
        conv.operationType = filters.operationType;
      }
      if (filters.maxPrice) {
        conv.state.budgetMax = filters.maxPrice;
        conv.montoRecibo = new Money(filters.maxPrice).format();
      }
      if (filters.city || filters.neighborhood) {
        conv.state.preferredZones = [filters.neighborhood, filters.city].filter(Boolean).join(', ');
        conv.preferredZones = conv.state.preferredZones;
      }
      if (filters.type) {
        conv.state.propertyType = filters.type;
      }

      const matchedIds = [
        ...result.exactMatches.map((p) => p.id),
        ...result.nearbyAlternatives.map((p) => p.id),
      ];
      conv.state.matchedPropertyIds = matchedIds;
      const top = result.exactMatches[0] || result.nearbyAlternatives[0];
      if (top) {
        conv.sistemaEstimado = top.title;
        conv.costoEstimado = top.priceFormatted;
      }
      return result;
    }

    if (name === 'obtener_detalle_propiedad') {
      const id = String(args.property_id || '');
      const detail = await this.propertyCatalog.getById(id);
      if (!detail) {
        return {
          error: 'Propiedad no encontrada o no activa en stock. No ofrezcas este inmueble.',
          property_id: id,
        };
      }
      conv.state.matchedPropertyIds = Array.from(
        new Set([...(conv.state.matchedPropertyIds || []), detail.id]),
      );
      conv.sistemaEstimado = detail.title;
      conv.costoEstimado = detail.priceFormatted;
      return detail;
    }

    if (name === 'registrar_prospecto_calificado') {
      const score = new LeadScore(args.lead_score as number);
      conv.state.leadScore = score.value;
      conv.state.phase = 'LEAD_GENERATED';
      if (args.nombre) conv.nombre = String(args.nombre);
      return { status: 'ok', message: 'Prospecto registrado y sincronizado con CRM InverLand.' };
    }

    return { error: `Unknown tool: ${name}` };
  }

  private async _saveLeadAndNotify(args: Record<string, unknown>, conv: Conversation): Promise<void> {
    const score = new LeadScore((args.lead_score as number) ?? 50);
    const budgetNum = typeof args.budget_mxn === 'number' ? args.budget_mxn : conv.state.budgetMax;
    const matchedIds = args.matched_property_ids
      ? String(args.matched_property_ids)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : conv.state.matchedPropertyIds || [];

    const lead: Lead = {
      id: `lead_${conv.tenantId}_${conv.phone}`,
      tenantId: conv.tenantId,
      phone: conv.phone,
      nombre: String(args.nombre || conv.nombre),
      operationType: String(args.operation_type || conv.state.operationType || ''),
      budget: budgetNum ? new Money(budgetNum).format() : undefined,
      preferredZones: String(args.preferred_zones || conv.state.preferredZones || ''),
      propertyType: String(args.property_type || conv.state.propertyType || ''),
      matchedPropertyIds: matchedIds,
      matchedPropertyTitles: String(args.matched_property_titles || conv.sistemaEstimado || ''),
      montoRecibo: budgetNum ? new Money(budgetNum).format() : undefined,
      sistemaEstimado: String(args.matched_property_titles || conv.sistemaEstimado || ''),
      costoEstimado: conv.costoEstimado,
      leadScore: score.value,
      notasTecnicas: String(args.notas || ''),
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    };

    await this.leadSync.syncLead(lead);
    logger.info('[LLMOrchestrator] Lead synced', {
      leadId: lead.id,
      score: score.value,
      label: score.label,
    });
  }
}
