import React, { useState, useEffect, useRef } from 'react';
import TableVisual from './TableVisual';
import './RealTimeSeatingMap.css';

const RealTimeSeatingMap = ({ eventId, tables, seatings, onSeatingsUpdate, activeHallTab }) => {
  const [realTimeSeatings, setRealTimeSeatings] = useState(seatings);
  const [isConnected, setIsConnected] = useState(false);
  const [activeGuests, setActiveGuests] = useState(new Set());
  const [genderFilter, setGenderFilter] = useState(activeHallTab === 'm' ? 'male' : 'female'); // השתמש במגדר הנכון
  
  // עדכון genderFilter כשמשנים activeHallTab
  useEffect(() => {
    setGenderFilter(activeHallTab === 'm' ? 'male' : 'female');
    console.log('RealTimeSeatingMap: Updated genderFilter to:', activeHallTab === 'm' ? 'male' : 'female');
  }, [activeHallTab]);
  const [pausedAnimations, setPausedAnimations] = useState(new Set()); // שולחנות שעצרו את האנימציה

  // עדכון הנתונים כשהם משתנים מהדשבורד
  useEffect(() => {
    setRealTimeSeatings(seatings);
    console.log('RealTimeSeatingMap received seatings:', seatings);
    console.log('RealTimeSeatingMap received tables:', tables);
    console.log('Number of seatings:', seatings.length);
    console.log('Number of tables:', tables.length);
    console.log('Current genderFilter:', genderFilter);
    console.log('Current activeHallTab:', activeHallTab);
    
    // Debug: Log each seating
    seatings.forEach((seating, index) => {
      console.log(`Seating ${index + 1}:`, {
        id: seating.id,
        guest_id: seating.guest_id,
        guest_name: seating.guest_name,
        guest_gender: seating.guest_gender,
        table_id: seating.table_id,
        table_number: seating.table_number,
        is_occupied: seating.is_occupied,
        occupied_at: seating.occupied_at
      });
    });
  }, [seatings]);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8001/realtime/ws/${eventId}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected for seating map');
      setIsConnected(true);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);
      
      if (data.type === 'guest_arrived') {
        console.log('Guest arrived:', data.guest);
        // אין רענון עמוד — ההורה (RealTimeDashboard) כבר טוען מחדש נתונים דרך ה-WebSocket שלו
        // כאן נשאיר לוג בלבד כדי לא להחליף טאב
      } else if (data.type === 'table_full') {
        console.log('Table full notification:', data);
        // אפשר להוסיף התראה מיוחדת לשולחן מלא
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected for seating map');
      setIsConnected(false);
    };
    
    return () => ws.close();
  }, [eventId, realTimeSeatings, onSeatingsUpdate]);

  const getSeatColor = (seating) => {
    if (seating.is_occupied) {
      // צבעים שונים לגברים ונשים
      if (seating.guest_gender === 'male') {
        return '#4A90E2'; // כחול לגברים
      } else if (seating.guest_gender === 'female') {
        return '#E91E63'; // ורוד לנשים
      }
      return '#C0C0C0'; // כסף - ברירת מחדל
    }
    if (seating.guest_id) {
      return '#90EE90'; // ירוק בהיר - מוקצה אבל לא נכנס
    }
    return '#FFFFFF'; // לבן - פנוי
  };

  const getSeatStatus = (seating) => {
    if (seating.is_occupied) {
      return 'occupied';
    }
    if (seating.guest_id) {
      return 'assigned';
    }
    return 'empty';
  };

  const handleTableClick = (tableId) => {
    setPausedAnimations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableId)) {
        newSet.delete(tableId); // הפעל מחדש את האנימציה
      } else {
        newSet.add(tableId); // עצור את האנימציה
      }
      return newSet;
    });
  };

  const getTableStatus = (table) => {
    const tableSeatings = realTimeSeatings.filter(s => s.table_id === table.id);
    const occupiedSeats = tableSeatings.filter(s => s.is_occupied).length;
    const totalSeats = table.size; // השתמש בגודל האמיתי של השולחן
    
    console.log(`Table ${table.table_number} status calculation:`, {
      table_id: table.id,
      tableSeatings: tableSeatings.length,
      occupiedSeats: occupiedSeats,
      totalSeats: totalSeats,
      tableSize: table.size,
      seatings: tableSeatings.map(s => ({
        guest_name: s.guest_name,
        is_occupied: s.is_occupied,
        guest_gender: s.guest_gender
      }))
    });
    
    if (totalSeats === 0) return 'empty';
    if (occupiedSeats === 0) return 'empty';
    if (occupiedSeats > totalSeats) return 'overbooked';
    if (occupiedSeats === totalSeats) return 'full';
    
    // בדיקה אם השולחן כמעט מלא (80%+)
    const occupancyPercentage = (occupiedSeats / totalSeats) * 100;
    if (occupancyPercentage >= 80) return 'almost_full';
    
    return 'partial';
  };

  const getTableStatusColor = (status) => {
    switch (status) {
      case 'empty':
        return '#E8F5E8';
      case 'partial':
        return '#FFF3CD';
      case 'almost_full':
        return '#FFE0B2'; // כתום לשולחנות כמעט מלאים
      case 'full':
        return '#FFCDD2'; // אדום לשולחנות מלאים
      case 'overbooked':
        return '#F8D7DA';
      default:
        return '#FFFFFF';
    }
  };

  const getTableStatusText = (status) => {
    switch (status) {
      case 'empty':
        return 'ריק';
      case 'partial':
        return 'חלקי';
      case 'almost_full':
        return 'כמעט מלא';
      case 'full':
        return 'מלא';
      case 'overbooked':
        return 'עודף';
      default:
        return '';
    }
  };

  // סינון מושבים לפי מגדר
  const filteredSeatings = realTimeSeatings.filter(seating => {
    if (genderFilter === 'all') return true;
    if (genderFilter === 'male') return seating.guest_gender === 'male';
    if (genderFilter === 'female') return seating.guest_gender === 'female';
    return true;
  });

  // חישוב סטטיסטיקות
  const totalSeatings = realTimeSeatings.length;
  const occupiedSeatings = realTimeSeatings.filter(s => s.is_occupied).length;
  const maleSeatings = realTimeSeatings.filter(s => s.guest_gender === 'male' && s.is_occupied).length;
  const femaleSeatings = realTimeSeatings.filter(s => s.guest_gender === 'female' && s.is_occupied).length;

  console.log('Seating Map Statistics:', {
    totalSeatings: totalSeatings,
    occupiedSeatings: occupiedSeatings,
    maleSeatings: maleSeatings,
    femaleSeatings: femaleSeatings,
    allSeatings: realTimeSeatings.map(s => ({
      guest_name: s.guest_name,
      guest_gender: s.guest_gender,
      is_occupied: s.is_occupied,
      table_number: s.table_number
    }))
  });

  return (
    <div className="realtime-seating-map">
      {/* Connection Status */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        <div className="status-dot"></div>
        <span>{isConnected ? 'מחובר' : 'מנותק'}</span>
      </div>

      {/* Main Content Layout */}
      <div className="main-content-layout">
        {/* Left Sidebar - Statistics */}
        <div className="left-sidebar">
          {/* Statistics */}
          <div className="seating-stats-vertical">
            <div className="stat-item-vertical">
              <div className="stat-number">{occupiedSeatings}/{totalSeatings}</div>
              <span>נכנסו</span>
            </div>
            <div className="stat-item-vertical">
              <div className="stat-number male">{maleSeatings}</div>
              <span>גברים</span>
            </div>
            <div className="stat-item-vertical">
              <div className="stat-number female">{femaleSeatings}</div>
              <span>נשים</span>
            </div>
          </div>

          {/* Gender Filter */}
          <div className="gender-filter-vertical">
            <button 
              className={`filter-btn ${genderFilter === 'male' ? 'active' : ''}`}
              onClick={() => setGenderFilter('male')}
            >
              גברים
            </button>
            <button 
              className={`filter-btn ${genderFilter === 'female' ? 'active' : ''}`}
              onClick={() => setGenderFilter('female')}
            >
              נשים
            </button>
          </div>

          {/* Additional Statistics */}
          <div className="seating-stats-vertical">
            <div className="stat-item-vertical">
              <div className="stat-number">{occupiedSeatings}</div>
              <span>נכנסו</span>
            </div>
            <div className="stat-item-vertical">
              <div className="stat-number">{totalSeatings - occupiedSeatings}</div>
              <span>נותרו</span>
            </div>
            <div className="stat-item-vertical">
              <div className="stat-number">{Math.round((occupiedSeatings / totalSeatings) * 100)}%</div>
              <span>תפוסה</span>
            </div>
          </div>
        </div>

        {/* Right Content - Seating Map */}
        <div className="right-content">
          {/* Seating Map */}
          <div className="seating-map">
        {Array.isArray(tables) && tables.length > 0 ? (
          tables
            .filter(table => {
              // הפילטר עובד לפי hall_type של השולחן
              console.log(`Filtering table ${table.table_number}:`, {
                table_hall_type: table.hall_type,
                genderFilter: genderFilter,
                shouldShow: (genderFilter === 'male' && table.hall_type === 'm') || 
                           (genderFilter === 'female' && table.hall_type === 'w')
              });
              
              if (genderFilter === 'male') return table.hall_type === 'm';
              if (genderFilter === 'female') return table.hall_type === 'w';
              
              return false; // אם אין פילטר מתאים, אל תציג
            })
            .map(table => {
              const tableStatus = getTableStatus(table);
              // השתמש בכל המושבים של השולחן
              const tableSeatings = realTimeSeatings.filter(s => s.table_id === table.id);
              const occupiedCount = tableSeatings.filter(s => s.is_occupied).length;
              const totalCount = table.size; // השתמש בגודל האמיתי של השולחן
              
              // יצירת רשימת אורחים מהמושבים התפוסים
              const tableGuests = tableSeatings
                .filter(s => s.is_occupied && s.guest_name)
                .map(s => ({ 
                  name: s.guest_name, 
                  full_name: s.guest_name,
                  id: s.guest_id 
                }));
              
              return (
                <div 
                  key={table.id} 
                  className={`table-container ${tableStatus} ${pausedAnimations.has(table.id) ? 'animation-paused' : ''}`}
                  style={{ backgroundColor: getTableStatusColor(tableStatus) }}
                  onClick={() => handleTableClick(table.id)}
                  title={pausedAnimations.has(table.id) ? 'לחץ להפעלת אנימציה' : 'לחץ לעצירת אנימציה'}
                >
                  {/* תמונת השולחן */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    <TableVisual
                      table={table}
                      isDragging={false}
                      isViewer={true}
                      onMouseDown={() => {}}
                      style={{ 
                        position: 'relative', 
                        left: 0, 
                        top: 0, 
                        transform: 'scale(0.7)',
                        transformOrigin: 'center'
                      }}
                      tableNumber={table.table_number || table.id}
                      guests={tableGuests}
                    />
                  </div>
                  
                <div className="table-header">
                  <h3 className="table-name">שולחן {table.table_number}</h3>
                  <div className="table-status">
                    <span className={`status-badge ${tableStatus}`}>
                      {getTableStatusText(tableStatus)}
                    </span>
                    <span className="seats-count">
                      {occupiedCount}/{totalCount}
                    </span>
                    {totalCount > 0 && (
                      <span className="occupancy-percentage">
                        ({Math.round((occupiedCount / totalCount) * 100)}%)
                      </span>
                    )}
                  </div>
                  {pausedAnimations.has(table.id) && (
                    <div className="paused-indicator">
                      ⏸️
                    </div>
                  )}
                </div>
                
                <div className="seats-container">
                  {tableSeatings.map(seating => (
                    <div
                      key={seating.id}
                      className={`seat ${getSeatStatus(seating)} ${seating.guest_gender || ''}`}
                      style={{ backgroundColor: getSeatColor(seating) }}
                    >
                      <div className="seat-content">
                        <div className="guest-name">
                          {seating.guest_name || 'פנוי'}
                        </div>
                        {seating.guest_gender && (
                          <div className="guest-gender">
                            {seating.guest_gender === 'male' ? '👨' : '👩'}
                          </div>
                        )}
                        {seating.is_occupied && (
                          <div className="occupied-indicator">
                            <span className="check-icon">✓</span>
                            <span className="check-time">
                              {new Date(seating.occupied_at).toLocaleTimeString('he-IL', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-data-message">
            <div className="no-data-icon">📋</div>
            <div className="no-data-text">אין שולחנות זמינים</div>
            <div className="no-data-subtext">הוסף שולחנות בהגדרות האירוע</div>
            <div className="debug-info" style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              Debug: tables={Array.isArray(tables) ? tables.length : 'not array'}, 
              genderFilter={genderFilter}, 
              activeHallTab={activeHallTab}
            </div>
          </div>
        )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default RealTimeSeatingMap; 