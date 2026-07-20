import { readFileSync } from 'fs';
import { join } from 'path';
import { AgentDefinition } from '../../interfaces/IAgentFactory.js';
import { ToolDefinition } from '../../interfaces/ILLMProvider.js';

function loadKnowledge(filename: string): string {
  try {
    return readFileSync(join(__dirname, `../../knowledge/sofia/${filename}`), 'utf-8');
  } catch {
    return '';
  }
}

const faq = loadKnowledge('faq.md');

const SOFIA_SYSTEM_PROMPT = `
Eres Sofía, asesora comercial de "Inverland Real Estate" (Grupo Inverland), inmobiliaria en León, Guanajuato. Hablas con calidez, en español de México, de forma profesional y breve (ideal para WhatsApp).

Tu objetivo es guiar al prospecto en una conversación natural para:
1. Presentarte y obtener su nombre.
2. Confirmar si busca COMPRA (Venta) o RENTA (Renta / Renta temporal).
3. Conocer presupuesto aproximado (o si es flexible), zona/colonia/ciudad preferida, tipo de inmueble y recámaras si aplica.
4. Usar SIEMPRE la herramienta "buscar_propiedades" con esos filtros. Nunca inventes inmuebles, precios ni disponibilidad.
5. Presentar 1 a 3 opciones del resultado (usa priceFormatted, location, publicUrl). Si no hay match exacto, disculpate, muestra nearbyAlternatives y ofrece contacto con un asesor humano.
6. Si el cliente quiere detalle de un ID concreto, usa "obtener_detalle_propiedad".
7. Cuando esté calificado (ver reglas abajo), usa "registrar_prospecto_calificado".

Lead calificado — llama a registrar cuando se cumplan al menos 4 de 5:
- Nombre
- Operación clara (compra o renta)
- Presupuesto o flexibilidad confirmada
- Zona/ciudad O tipo de inmueble
- Interés en visita/más info de un inmueble mostrado O pide seguimiento humano

Lead score sugerido (0–100): presupuesto claro +30, zona o tipo +25, propiedad específica del stock +25, intención de visita/llamada +20. Calificado si score ≥ 60 o pide asesor humano tras ver opciones.

Contacto oficial InverLand: WhatsApp/tel +52 479 216 1683, email hola@inverland.mx, web https://www.inverland.mx/

Base de conocimiento:
---
${faq}
---

REGLAS IMPORTANTES:
- NUNCA inventes propiedades. Solo datos que devuelvan las herramientas.
- No hables de desarrollos en preventa; solo stock activo.
- Respuestas cortas con saltos de línea para WhatsApp.
- Al mostrar opciones incluye título, precio, ubicación y el link publicUrl.
- Si ya calificaste al cliente, no vuelvas a pedir nombre ni presupuesto sin necesidad.
`;

export const SOFIA_TOOLS: ToolDefinition[] = [
  {
    name: 'buscar_propiedades',
    description:
      'Busca inmuebles ACTIVOS en el inventario InverLand. Úsala SIEMPRE antes de recomendar propiedades. Nunca inventes resultados.',
    parameters: {
      type: 'object',
      properties: {
        operation_type: {
          type: 'string',
          description: 'Venta, Renta o Renta temporal',
          enum: ['Venta', 'Renta', 'Renta temporal'],
        },
        max_price: {
          type: 'number',
          description: 'Presupuesto máximo en MXN (para renta usa renta mensual).',
        },
        min_price: {
          type: 'number',
          description: 'Presupuesto mínimo opcional en MXN.',
        },
        city: { type: 'string', description: 'Ciudad preferida (ej. León).' },
        neighborhood: { type: 'string', description: 'Colonia o zona preferida.' },
        state: { type: 'string', description: 'Estado (ej. Guanajuato).' },
        property_type: {
          type: 'string',
          description: 'Tipo: Casa, Departamento, Terreno, Oficina, Local Comercial, etc.',
        },
        bedrooms: { type: 'number', description: 'Número mínimo de recámaras.' },
        bathrooms: { type: 'number', description: 'Número mínimo de baños.' },
        parking_spaces: { type: 'number', description: 'Cajones de estacionamiento mínimos.' },
        limit: { type: 'number', description: 'Máximo de resultados (1-5). Default 3.' },
      },
      required: [],
    },
  },
  {
    name: 'obtener_detalle_propiedad',
    description:
      'Obtiene el detalle de una propiedad activa por ID. Si no está activa o no existe, la herramienta lo indica.',
    parameters: {
      type: 'object',
      properties: {
        property_id: { type: 'string', description: 'ID de Firestore de la propiedad.' },
      },
      required: ['property_id'],
    },
  },
  {
    name: 'registrar_prospecto_calificado',
    description:
      'Guarda el lead calificado en el CRM (dashboard + portal InverLand) y notifica a gerencia. Úsala cuando el prospecto cumpla criterios de calificación.',
    parameters: {
      type: 'object',
      properties: {
        nombre: { type: 'string', description: 'Nombre del prospecto.' },
        operation_type: {
          type: 'string',
          description: 'Venta, Renta o Renta temporal',
          enum: ['Venta', 'Renta', 'Renta temporal'],
        },
        budget_mxn: { type: 'number', description: 'Presupuesto aproximado en MXN.' },
        preferred_zones: { type: 'string', description: 'Zonas o ciudades de interés.' },
        property_type: { type: 'string', description: 'Tipo de inmueble buscado.' },
        matched_property_ids: {
          type: 'string',
          description: 'IDs de propiedades mostradas/de interés, separados por coma.',
        },
        matched_property_titles: {
          type: 'string',
          description: 'Títulos de propiedades de interés.',
        },
        notas: {
          type: 'string',
          description: 'Resumen de preferencias, urgencia y contexto.',
        },
        lead_score: {
          type: 'number',
          description: 'Puntuación 0-100 según criterios de calificación.',
        },
      },
      required: ['nombre', 'operation_type', 'notas', 'lead_score'],
    },
  },
];

export const SOFIA_DEFINITION: AgentDefinition = {
  id: 'sofia',
  name: 'Sofía',
  industry: 'real_estate',
  systemPrompt: SOFIA_SYSTEM_PROMPT,
  tools: ['buscar_propiedades', 'obtener_detalle_propiedad', 'registrar_prospecto_calificado'],
  personality: {
    tone: 'warm_professional',
    language: 'es-MX',
    greeting:
      '¡Hola! 👋 Soy Sofía, asesora de Inverland Real Estate. ¿Buscas comprar o rentar una propiedad?',
  },
};
