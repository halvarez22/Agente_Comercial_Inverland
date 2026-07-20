import { useState } from 'react';

export function useCopilot() {
  const [copilotMessages, setCopilotMessages] = useState<{ sender: 'user' | 'bot'; text: string; timestamp: string }[]>([
    {
      sender: 'bot',
      text: '¡Hola! Soy tu Copiloto de Ventas de Inverland Real Estate. Pregúntame sobre leads calificados, presupuestos, zonas de interés, tipos de operación o estadísticas de los chats.',
      timestamp: new Date().toISOString()
    }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotTyping, setIsCopilotTyping] = useState(false);

  const handleSendCopilotQuery = async (queryText?: string) => {
    const textToSend = queryText || copilotInput;
    if (!textToSend.trim() || isCopilotTyping) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    setCopilotMessages(prev => [...prev, userMsg]);
    if (!queryText) {
      setCopilotInput('');
    }
    setIsCopilotTyping(true);

    try {
      const chatHistory = copilotMessages.slice(-10).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch('/api/copilot/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: textToSend,
          history: chatHistory
        })
      });

      if (!res.ok) {
        throw new Error('Error al conectar con el copiloto');
      }

      const data = await res.json();
      setCopilotMessages(prev => [...prev, {
        sender: 'bot' as const,
        text: data.answer,
        timestamp: new Date().toISOString()
      }]);
    } catch (err: any) {
      console.error('Error in copilot request:', err);
      setCopilotMessages(prev => [...prev, {
        sender: 'bot' as const,
        text: 'Lo siento, ocurrió un error al consultar la base de datos con la IA. Verifica que el servidor esté activo y GROQ_API_KEY configurada.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsCopilotTyping(false);
    }
  };

  return {
    copilotMessages,
    setCopilotMessages,
    copilotInput,
    setCopilotInput,
    isCopilotTyping,
    handleSendCopilotQuery
  };
}
