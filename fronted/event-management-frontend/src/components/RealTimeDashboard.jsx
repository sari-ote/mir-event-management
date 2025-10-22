import React, { useState, useEffect } from 'react';
import RealTimeNotifications from './RealTimeNotifications';
import QRCodeScanner from './QRCodeScanner';
import RealTimeSeatingMap from './RealTimeSeatingMap';
import './RealTimeDashboard.css';

const RealTimeDashboard = ({ eventId }) => {
  const [tables, setTables] = useState([]);
  const [seatings, setSeatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scanner');
  const [activeHallTab, setActiveHallTab] = useState('m'); // הוסף בחירת מגדר
  const [ws, setWs] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const [tablesResponse, seatingsResponse] = await Promise.all([
        fetch(`http://localhost:8001/tables/event/${eventId}?hall_type=${activeHallTab}`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch(`http://localhost:8001/seatings/event/${eventId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
      ]);

      const tablesData = await tablesResponse.json();
      const seatingsData = await seatingsResponse.json();

      // וודא שהנתונים הם מערכים
      const tablesArray = Array.isArray(tablesData) ? tablesData : [];
      const seatingsArray = Array.isArray(seatingsData) ? seatingsData : [];

      console.log('Tables data:', tablesArray);
      console.log('Seatings data:', seatingsArray);
      console.log('Tables count:', tablesArray.length);
      console.log('Seatings count:', seatingsArray.length);
      console.log('Event ID:', eventId);
      console.log('Hall type:', activeHallTab);
      
      // Debug each table from RealTimeDashboard
      tablesArray.forEach((table, index) => {
        console.log(`RealTimeDashboard Table ${index + 1}:`, {
          id: table.id,
          table_number: table.table_number,
          size: table.size,
          shape: table.shape,
          hall_type: table.hall_type,
          x: table.x,
          y: table.y,
          category: table.category
        });
      });

      // Debug: Log gender statistics
      const maleSeatings = seatingsArray.filter(s => s.guest_gender === 'male');
      const femaleSeatings = seatingsArray.filter(s => s.guest_gender === 'female');
      console.log('Male seatings:', maleSeatings.length);
      console.log('Female seatings:', femaleSeatings.length);
      console.log('All seatings with gender:', seatingsArray.map(s => ({ name: s.guest_name, gender: s.guest_gender })));
      
      // Debug: Check for null/undefined genders
      const nullGenders = seatingsArray.filter(s => !s.guest_gender);
      console.log('Seatings with null/undefined gender:', nullGenders.length);
      console.log('All gender values:', seatingsArray.map(s => s.guest_gender));
      
      // Debug: Log each seating object
      console.log('Full seatings data:', seatingsArray);
      
      // Debug: Log the first seating object in detail
      if (seatingsArray.length > 0) {
        console.log('First seating object keys:', Object.keys(seatingsArray[0]));
        console.log('First seating object:', JSON.stringify(seatingsArray[0], null, 2));
      }

      // Debug: Log all seating objects
      console.log('All seating objects:');
      seatingsArray.forEach((seating, index) => {
        console.log(`Seating ${index + 1}:`, {
          id: seating.id,
          guest_id: seating.guest_id,
          guest_name: seating.guest_name,
          guest_gender: seating.guest_gender,
          table_id: seating.table_id,
          table_number: seating.table_number,
          is_occupied: seating.is_occupied,
          occupied_at: seating.occupied_at,
          occupied_by: seating.occupied_by
        });
      });

      setTables(tablesArray);
      setSeatings(seatingsArray);
    } catch (error) {
      console.error('Error loading data:', error);
      setTables([]);
      setSeatings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId, activeHallTab]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const websocket = new WebSocket(`ws://localhost:8001/realtime/ws/${eventId}`);
    
    websocket.onopen = () => {
      console.log('WebSocket connected for dashboard');
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Dashboard received WebSocket message:', data);
      
      if (data.type === 'guest_arrived') {
        console.log('Guest arrived in dashboard:', data.guest);
        // טען מחדש את הנתונים מהשרת כדי לקבל את העדכונים האחרונים, ללא רענון עמוד
        loadData();
      } else if (data.type === 'table_full') {
        console.log('Table full notification in dashboard:', data);
        // אפשר להוסיף התראה מיוחדת לשולחן מלא
      }
    };
    
    websocket.onclose = () => {
      console.log('WebSocket disconnected for dashboard');
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, [eventId]);

  const handleScanSuccess = (result) => {
    console.log('Scan successful:', result);
    // אפשר להוסיף לוגיקה נוספת כאן
  };

  const handleSeatingsUpdate = (updatedSeatings) => {
    setSeatings(updatedSeatings);
  };

  const handleUpdateGuestsGender = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8001/guests/update-gender-defaults/${eventId}`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`עודכנו ${result.updated_count} מוזמנים עם מגדר ברירת מחדל`);
        // טען מחדש את הנתונים ללא רענון עמוד
        loadData();
      } else {
        alert('שגיאה בעדכון המוזמנים');
      }
    } catch (error) {
      console.error('Error updating guests:', error);
      alert('שגיאה בעדכון המוזמנים');
    }
  };

  const handleFixSeatingStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8001/realtime/fix-seating-status/${eventId}`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`תוקנו ${result.fixed_count} מקומות ישיבה`);
        // טען מחדש את הנתונים
        loadData();
      } else {
        alert('שגיאה בתיקון מקומות ישיבה');
      }
    } catch (error) {
      console.error('Error fixing seating status:', error);
      alert('שגיאה בתיקון מקומות ישיבה');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">טוען מערכת זמן אמת...</div>
      </div>
    );
  }

  return (
    <div className="realtime-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">
            <span className="title-icon">⚡</span>
            מערכת זמן אמת - אירוע #{eventId}
          </h1>
          <div className="header-subtitle">
            ניהול כניסת מוזמנים והתראות בזמן אמת
          </div>
          
          {/* Hall Selection */}
          <div className="hall-selection" style={{ marginTop: '15px' }}>
            <button 
              className={`hall-button ${activeHallTab === 'm' ? 'active' : ''}`}
              onClick={() => setActiveHallTab('m')}
              style={{
                padding: '8px 16px',
                marginRight: '10px',
                backgroundColor: activeHallTab === 'm' ? '#2196F3' : '#f0f0f0',
                color: activeHallTab === 'm' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              👨 אולם גברים
            </button>
            <button 
              className={`hall-button ${activeHallTab === 'w' ? 'active' : ''}`}
              onClick={() => setActiveHallTab('w')}
              style={{
                padding: '8px 16px',
                backgroundColor: activeHallTab === 'w' ? '#E91E63' : '#f0f0f0',
                color: activeHallTab === 'w' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              👩 אולם נשים
            </button>
          </div>
          <button 
            onClick={handleUpdateGuestsGender}
            className="update-gender-btn"
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 עדכן מגדר למוזמנים קיימים
          </button>
          <button 
            onClick={handleFixSeatingStatus}
            className="fix-seating-btn"
            style={{
              marginTop: '10px',
              marginLeft: '10px',
              padding: '8px 16px',
              backgroundColor: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔧 תקן סטטוס מקומות ישיבה
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <span className="tab-icon">📱</span>
          <span className="tab-text">סריקת ברקוד</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'seating' ? 'active' : ''}`}
          onClick={() => setActiveTab('seating')}
        >
          <span className="tab-icon">🗺️</span>
          <span className="tab-text">מפת ישיבה</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-text">סטטיסטיקות</span>
        </button>
      </div>

      {/* Main Content with Sidebar */}
      <div className="dashboard-layout">
        {/* Main Content Area */}
        <div className="dashboard-content">
          {activeTab === 'scanner' && (
            <div className="tab-content">
              <QRCodeScanner 
                eventId={eventId} 
                onScan={handleScanSuccess}
              />
            </div>
          )}

          {activeTab === 'seating' && (
            <div className="tab-content">
              <RealTimeSeatingMap 
                eventId={eventId}
                tables={tables}
                seatings={seatings}
                onSeatingsUpdate={handleSeatingsUpdate}
                activeHallTab={activeHallTab}
              />
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="tab-content">
              <div className="stats-dashboard">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                      <div className="stat-value">
                        {Array.isArray(seatings) ? seatings.filter(s => s.is_occupied).length : 0}
                      </div>
                      <div className="stat-label">מוזמנים שנכנסו</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-info">
                      <div className="stat-value">
                        {Array.isArray(seatings) ? seatings.filter(s => s.guest_id && !s.is_occupied).length : 0}
                      </div>
                      <div className="stat-label">מוקצים</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🪑</div>
                    <div className="stat-info">
                      <div className="stat-value">
                        {Array.isArray(seatings) ? seatings.filter(s => !s.guest_id).length : 0}
                      </div>
                      <div className="stat-label">מקומות פנויים</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-info">
                      <div className="stat-value">
                        {Array.isArray(seatings) && seatings.length > 0 
                          ? Math.round((seatings.filter(s => s.is_occupied).length / seatings.length) * 100)
                          : 0}%
                      </div>
                      <div className="stat-label">אחוז נוכחות</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Notifications Sidebar */}
        <div className="notifications-sidebar">
          <RealTimeNotifications eventId={eventId} />
        </div>
      </div>
    </div>
  );
};

export default RealTimeDashboard; 