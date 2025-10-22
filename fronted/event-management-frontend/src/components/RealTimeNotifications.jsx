import React, { useEffect, useState } from 'react';
import './RealTimeNotifications.css';

const RealTimeNotifications = ({ eventId }) => {
  const [notifications, setNotifications] = useState([]);
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // חיבור WebSocket
    const websocket = new WebSocket(`ws://localhost:8001/realtime/ws/${eventId}`);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, [eventId]);

  // טען התראות מתמשכות שלא נקראו מהשרת והצג אותן עד לסגירה ידנית
  useEffect(() => {
    let isCancelled = false;
    let intervalId;

    const loadUnread = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8001/realtime/notifications/${eventId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (isCancelled) return;

        // מיפוי התראות שרת: מתמשכות רק לסוגים מסוימים
        const mapped = (Array.isArray(data) ? data : []).map(n => {
          const isPersistent = (
            n.notification_type === 'guest_arrived_no_seat' ||
            n.notification_type === 'table_full' ||
            n.notification_type === 'table_overbooked'
          );
          const type = n.notification_type === 'guest_arrived_no_seat' ? 'warning'
                     : n.notification_type === 'table_full' ? 'warning'
                     : n.notification_type === 'table_overbooked' ? 'error'
                     : 'success';
          const title = n.notification_type === 'guest_arrived_no_seat' ? 'מוזמן ללא מקום ישיבה'
                     : n.notification_type === 'guest_arrived' ? 'מוזמן נכנס'
                     : 'התראה';
          return {
            id: `srv-${n.id}`,
            serverId: n.id,
            type,
            title,
            message: n.message,
            timestamp: new Date(n.created_at || Date.now()).toLocaleTimeString('he-IL'),
            persistent: isPersistent,
            autoDismissMs: isPersistent ? undefined : 3000
          };
        });

        // איחוד: אל תיצור כפולים לפי serverId
        setNotifications(prev => {
          const existingIds = new Set(prev.filter(x => x.serverId).map(x => x.serverId));
          const toAdd = mapped.filter(m => !existingIds.has(m.serverId));
          // קבע טיימר להסרת התראות שאינן מתמשכות + סימון נקרא
          toAdd.forEach(m => {
            if (m.autoDismissMs) {
              setTimeout(async () => {
                // סמן כנקרא בשרת
                try {
                  const token2 = localStorage.getItem('access_token');
                  await fetch(`http://localhost:8001/realtime/notifications/${m.serverId}/mark-read`, {
                    method: 'POST', headers: { 'Authorization': `Bearer ${token2}` }
                  });
                } catch {}
                setNotifications(curr => curr.filter(x => x.id !== m.id));
              }, m.autoDismissMs);
            }
          });
          return [...toAdd, ...prev];
        });
      } catch (e) {
        // ignore
      }
    };

    loadUnread();
    intervalId = setInterval(loadUnread, 5000);

    return () => { isCancelled = true; clearInterval(intervalId); };
  }, [eventId]);

  const handleWebSocketMessage = (data) => {
    console.log('Received WebSocket message:', data);
    
    if (data.type === 'guest_arrived') {
      showNotification(data);
    } else if (data.type === 'table_full') {
      showTableFullNotification(data);
    } else if (data.type === 'table_almost_full') {
      showTableAlmostFullNotification(data);
    } else if (data.type === 'table_overbooked') {
      showTableOverbookedNotification(data);
    }
  };

  const showNotification = (data) => {
    const hasSeating = data.guest.table_id !== null && data.guest.table_id !== undefined;
    const isNoSeat = !hasSeating;
    const notification = {
      id: Date.now(),
      type: isNoSeat ? 'warning' : 'success',
      title: isNoSeat ? 'מוזמן ללא מקום ישיבה' : 'מוזמן נכנס',
      message: isNoSeat
        ? `${data.guest.first_name} ${data.guest.last_name} נכנס ללא מקום`
        : `${data.guest.first_name} ${data.guest.last_name} נכנס לאירוע`,
      timestamp: new Date().toLocaleTimeString('he-IL'),
      guest: data.guest,
      hasSeating,
      gender: data.guest.gender || 'unknown',
      persistent: isNoSeat // ללא מקום ישיבה יישאר עד סגירה ידנית
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);

    // אם יש מקום ישיבה – סגור אוטומטית אחרי 3 שניות
    if (hasSeating) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 3000);
    }
  };

  const showTableFullNotification = (data) => {
    const notification = {
      id: Date.now(),
      type: 'warning',
      title: '🚨 שולחן מלא!',
      message: `שולחן ${data.table.table_number} מלא! ${data.guest.first_name} ${data.guest.last_name} נכנס לשולחן מלא`,
      timestamp: new Date().toLocaleTimeString('he-IL'),
      tableId: data.table.id,
      tableNumber: data.table.table_number,
      occupancyPercentage: data.table.occupancy_percentage,
      persistent: true // התראות על שולחן מלא נשארות עד סגירה ידנית
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    // אין setTimeout - ההתראה תישאר עד סגירה ידנית
  };

  const showTableAlmostFullNotification = (data) => {
    const notification = {
      id: Date.now(),
      type: 'info',
      title: '⚠️ שולחן כמעט מלא',
      message: `שולחן ${data.table.table_number} כמעט מלא (${data.table.occupancy_percentage.toFixed(1)}%) - ${data.guest.first_name} ${data.guest.last_name} נכנס`,
      timestamp: new Date().toLocaleTimeString('he-IL'),
      tableId: data.table.id,
      tableNumber: data.table.table_number,
      occupancyPercentage: data.table.occupancy_percentage,
      persistent: false // התראות על שולחן כמעט מלא נעלמות אחרי זמן
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    
    // התראה על שולחן כמעט מלא נעלמת אחרי 15 שניות
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 15000);
  };

  const showTableOverbookedNotification = (data) => {
    const notification = {
      id: Date.now(),
      type: 'error',
      title: '🚨 שולחן מלא מדי!',
      message: `שולחן ${data.table.table_number} מלא מדי! (${data.table.occupancy_percentage.toFixed(1)}%) - ${data.guest.first_name} ${data.guest.last_name} נכנס לשולחן מלא מדי`,
      timestamp: new Date().toLocaleTimeString('he-IL'),
      tableId: data.table.id,
      tableNumber: data.table.table_number,
      occupancyPercentage: data.table.occupancy_percentage,
      persistent: true // התראות על שולחן מלא מדי נשארות עד סגירה ידנית
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    // אין setTimeout - ההתראה תישאר עד סגירה ידנית
  };

  const dismissNotification = async (notificationId) => {
    const n = notifications.find(x => x.id === notificationId);
    if (n && n.serverId) {
      try {
        const token = localStorage.getItem('access_token');
        await fetch(`http://localhost:8001/realtime/notifications/${n.serverId}/mark-read`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {}
    }
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getNotificationIcon = (notification) => {
    if (notification.type === 'warning') {
      return '🚨';
    }
    if (notification.type === 'info') {
      return '⚠️';
    }
    if (notification.type === 'error') {
      return '🚨'; // שימוש בסמל שולחן מלא מדי במקום סמל שגיאה
    }
    if (notification.gender === 'male') {
      return '👨';
    } else if (notification.gender === 'female') {
      return '👩';
    }
    return '👤';
  };

  const getNotificationColor = (notification) => {
    if (notification.type === 'warning') {
      return '#F44336'; // אדום להתראות אזהרה
    }
    if (notification.type === 'info') {
      return '#FF9800'; // כתום להתראות מידע
    }
    if (notification.type === 'error') {
      return '#F44336'; // אדום להתראות שגיאה
    }
    if (notification.gender === 'male') {
      return '#4A90E2'; // כחול לגברים
    } else if (notification.gender === 'female') {
      return '#E91E63'; // ורוד לנשים
    }
    return '#4CAF50'; // ירוק - ברירת מחדל
  };

  const getNotificationClass = (notification) => {
    if (notification.type === 'warning' && notification.persistent) {
      return 'notification-card warning table-full';
    }
    if (notification.type === 'info' && notification.occupancyPercentage >= 80) {
      return 'notification-card info table-almost-full';
    }
    if (notification.type === 'error' && notification.persistent) {
      return 'notification-card error table-overbooked';
    }
    return `notification-card ${notification.type}`;
  };

  return (
    <div className="realtime-notifications-container">
      {/* Connection Status */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        <div className="status-dot"></div>
        <span>{isConnected ? 'מחובר' : 'מנותק'}</span>
      </div>

      {/* Notifications */}
      <div className="notifications-wrapper">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={getNotificationClass(notification)}
            style={{ borderLeftColor: getNotificationColor(notification) }}
          >
            <div className="notification-header">
              <div className="notification-icon">
                {getNotificationIcon(notification)}
              </div>
              <div className="notification-title">
                {notification.title}
              </div>
              <div className="notification-time">
                {notification.timestamp}
              </div>
              {/* כפתור סגירה להתראות מתמשכות */}
              {notification.persistent && (
                <button 
                  className="dismiss-button"
                  onClick={() => dismissNotification(notification.id)}
                  title="סגור התראה"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="notification-message">
              {notification.message}
            </div>
            
            {notification.guest && (
              <div className="guest-details">
                <div className="guest-info">
                  <span className="guest-name">{notification.guest.first_name} {notification.guest.last_name}</span>
                  {notification.hasSeating ? (
                    <span className="seating-info">📍 שולחן {notification.guest.table_id}</span>
                  ) : (
                    <span className="no-seating">⚠️ ללא מקום ישיבה</span>
                  )}
                </div>
              </div>
            )}

            {notification.tableNumber && (
              <div className="table-details">
                <div className="table-info">
                  <span className="table-number">שולחן {notification.tableNumber}</span>
                  <span className="table-status">
                    {notification.occupancyPercentage >= 100 ? 'מלא' : `${notification.occupancyPercentage.toFixed(1)}% תפוס`}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {notifications.length === 0 && (
        <div className="empty-notifications">
          <div className="empty-icon">🔔</div>
          <div className="empty-text">אין התראות חדשות</div>
          <div className="empty-subtext">התראות יופיעו כאן כשמוזמנים ייכנסו</div>
        </div>
      )}
    </div>
  );
};

export default RealTimeNotifications; 