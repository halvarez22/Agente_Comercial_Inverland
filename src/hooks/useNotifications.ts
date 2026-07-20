import { useState, useEffect, useCallback } from 'react';
import { QualifiedLead } from '../types';

export function useNotifications() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Tu navegador no soporta notificaciones de escritorio.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        showToast('¡Notificaciones activadas con éxito!');
        new Notification('InverLand Alertas', {
          body: 'Notificaciones activadas para nuevos leads calificados.',
          icon: '/images/logo-inverland.png'
        });
      } else if (permission === 'denied') {
        showToast('Notificaciones rechazadas por el usuario.');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  const triggerBrowserNotification = useCallback((lead: QualifiedLead, onNotificationClick: () => void) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = `Lead Calificado: ${lead.nombre || 'Cliente Nuevo'}`;
      const options = {
        body: `${lead.operationType || 'Interés'} | Presupuesto: ${lead.budget || lead.montoRecibo || '—'} | ${lead.sistemaEstimado || lead.matchedPropertyTitles || 'Sin propiedad'}`,
        icon: '/images/logo-inverland.png',
        tag: lead.id,
        requireInteraction: true
      };

      const notification = new Notification(title, options);

      notification.onclick = () => {
        window.focus();
        onNotificationClick();
        notification.close();
      };
    }
  }, []);

  return {
    toastMessage,
    showToast,
    notificationPermission,
    requestNotificationPermission,
    triggerBrowserNotification
  };
}
