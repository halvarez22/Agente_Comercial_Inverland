export const AppConfig = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  tenant: {
    defaultId: process.env.TENANT_ID || 'inverland',
  },
  portal: {
    publicSiteUrl: process.env.PORTAL_PUBLIC_URL || 'https://www.inverland.mx',
    propertyBaseUrl: process.env.PROPERTY_BASE_URL || 'https://www.inverland.mx/propiedad',
  },
  company: {
    name: 'Inverland Real Estate',
    phone: process.env.COMPANY_PHONE || '+524792161683',
    email: process.env.COMPANY_EMAIL || 'hola@inverland.mx',
    whatsappDisplay: process.env.COMPANY_WHATSAPP_DISPLAY || '+52 479 216 1683',
  },
  meta: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'INVERLAND_WHATSAPP_TOKEN',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  },
  alerts: {
    whatsappNumber: (process.env.ALERT_WHATSAPP_NUMBER || '524792161683').replace(/\D/g, ''),
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
  },
  smtp: {
    server: process.env.SMTP_SERVER || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SENDER_EMAIL || 'hola@inverland.mx',
    pass: process.env.SENDER_PASSWORD || '',
    salesEmail: process.env.SALES_EMAIL || 'hola@inverland.mx',
  },
};
