import { Lead } from '../../domain/entities/Lead.js';
import { AppConfig } from '../../shared/config/AppConfig.js';
import { logger } from '../../shared/logger/ConsoleLogger.js';
import nodemailer from 'nodemailer';

export interface PortalClientSync {
  name: string;
  email?: string;
  phone: string;
  status: 'Lead' | 'Contactado' | 'Activo' | 'En espera' | 'Descartado';
  leadSource: 'Web' | 'Referido' | 'Llamada' | 'Otro';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dual-writes qualified leads to:
 * 1) tenants/{tenant}/qualified_leads (agent dashboard)
 * 2) clients collection (InverLand portal CRM)
 * Plus email + WhatsApp alerts to management.
 */
export class LeadSyncService {
  constructor(
    private db: any | null,
    private saveQualifiedLead: (lead: Lead) => Promise<void>,
    private sendWhatsApp: (phone: string, text: string) => Promise<boolean>,
  ) {}

  async syncLead(lead: Lead): Promise<{ portalClientId?: string }> {
    await this.saveQualifiedLead(lead);

    let portalClientId: string | undefined;
    try {
      portalClientId = await this.upsertPortalClient(lead);
      if (portalClientId) {
        lead.portalClientId = portalClientId;
        await this.saveQualifiedLead(lead);
      }
    } catch (err: any) {
      logger.error('[LeadSyncService] Portal client sync failed', { error: err.message });
    }

    await this.sendEmailAlert(lead);
    await this.sendWhatsAppAlert(lead);

    return { portalClientId };
  }

  private async upsertPortalClient(lead: Lead): Promise<string | undefined> {
    if (!this.db) {
      logger.info('[LeadSyncService] No Firestore — skipping clients collection write');
      return undefined;
    }

    const notes = [
      `Lead WhatsApp Sofía (score ${lead.leadScore}/100)`,
      lead.operationType ? `Operación: ${lead.operationType}` : null,
      lead.budget ? `Presupuesto: ${lead.budget}` : null,
      lead.preferredZones ? `Zonas: ${lead.preferredZones}` : null,
      lead.propertyType ? `Tipo: ${lead.propertyType}` : null,
      lead.matchedPropertyTitles ? `Interés: ${lead.matchedPropertyTitles}` : null,
      lead.matchedPropertyIds?.length ? `IDs: ${lead.matchedPropertyIds.join(', ')}` : null,
      lead.notasTecnicas ? `Notas: ${lead.notasTecnicas}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const phoneVariants = [lead.phone, `+${lead.phone}`, lead.phone.replace(/^52/, '')];
    const snap = await this.db.collection('clients').get();
    const existing = snap.docs.find((d: any) => {
      const p = String(d.data().phone || '').replace(/\D/g, '');
      return phoneVariants.some((v) => p && p.includes(v.replace(/\D/g, '')));
    });

    const now = new Date().toISOString();
    if (existing) {
      const prevNotes = existing.data().notes || '';
      await existing.ref.set(
        {
          name: lead.nombre || existing.data().name,
          phone: lead.phone,
          status: 'Lead',
          leadSource: 'Otro',
          notes: prevNotes ? `${prevNotes}\n---\n${notes}` : notes,
          updatedAt: now,
        },
        { merge: true },
      );
      logger.info('[LeadSyncService] Updated portal client', { id: existing.id });
      return existing.id;
    }

    const payload: PortalClientSync = {
      name: lead.nombre,
      phone: lead.phone,
      status: 'Lead',
      leadSource: 'Otro',
      notes,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await this.db.collection('clients').add(payload);
    logger.info('[LeadSyncService] Created portal client', { id: ref.id });
    return ref.id;
  }

  private async sendEmailAlert(lead: Lead): Promise<void> {
    const cfg = AppConfig.smtp;
    if (!cfg.pass) {
      logger.info('[LeadSyncService] SMTP not configured — skipping email', { leadId: lead.id });
      return;
    }
    try {
      const t = nodemailer.createTransport({
        host: cfg.server,
        port: cfg.port,
        secure: cfg.port === 465,
        auth: { user: cfg.user, pass: cfg.pass },
      });
      await t.sendMail({
        from: `"Alertas InverLand AI" <${cfg.user}>`,
        to: cfg.salesEmail,
        subject: `Lead #${lead.leadScore}/100 — ${lead.nombre} | ${lead.operationType || 'Interés inmobiliario'}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
            <div style="background:#0f766e;color:white;padding:24px;text-align:center">
              <h1 style="margin:0">Nuevo Lead Calificado — InverLand</h1>
              <p style="margin:4px 0 0;opacity:.9">Score: ${lead.leadScore}/100 — Sofía WhatsApp</p>
            </div>
            <div style="padding:24px;color:#334155">
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px 0;font-weight:bold;color:#64748b">Nombre:</td><td>${lead.nombre}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold;color:#64748b">WhatsApp:</td><td>+${lead.phone}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold;color:#64748b">Operación:</td><td>${lead.operationType || '—'}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold;color:#64748b">Presupuesto:</td><td>${lead.budget || '—'}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold;color:#64748b">Zonas:</td><td>${lead.preferredZones || '—'}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold;color:#64748b">Tipo:</td><td>${lead.propertyType || '—'}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold;color:#64748b">Interés:</td><td>${lead.matchedPropertyTitles || lead.sistemaEstimado || '—'}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold;color:#64748b">Notas:</td><td>${lead.notasTecnicas || '—'}</td></tr>
              </table>
              <div style="text-align:center;margin-top:24px">
                <a href="https://wa.me/${lead.phone}" style="background:#0f766e;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold">Atender en WhatsApp</a>
              </div>
            </div>
          </div>`,
      });
      logger.info('[LeadSyncService] Email alert sent', { to: cfg.salesEmail });
    } catch (err: any) {
      logger.error('[LeadSyncService] Email send failed', { error: err.message });
    }
  }

  private async sendWhatsAppAlert(lead: Lead): Promise<void> {
    const alertPhone = AppConfig.alerts.whatsappNumber;
    if (!alertPhone) return;
    const text =
      `🏡 *Nuevo lead InverLand*\n` +
      `Score: ${lead.leadScore}/100\n` +
      `Nombre: ${lead.nombre}\n` +
      `WhatsApp: +${lead.phone}\n` +
      `Operación: ${lead.operationType || '—'}\n` +
      `Presupuesto: ${lead.budget || '—'}\n` +
      `Zonas: ${lead.preferredZones || '—'}\n` +
      `Interés: ${lead.matchedPropertyTitles || lead.sistemaEstimado || '—'}`;
    try {
      await this.sendWhatsApp(alertPhone, text);
      logger.info('[LeadSyncService] WhatsApp alert sent', { to: alertPhone });
    } catch (err: any) {
      logger.error('[LeadSyncService] WhatsApp alert failed', { error: err.message });
    }
  }
}
