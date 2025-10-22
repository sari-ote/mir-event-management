import React, { useEffect, useRef, useState } from 'react';
import TableVisual from './TableVisual';

export default function HallMapOverlay({ eventId, hallType = 'm', tables = [], onClose }) {
  const mapRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panInfo = useRef({ isPanning: false, startMouseX: 0, startMouseY: 0, startPanX: 0, startPanY: 0 });
  const [hallElements, setHallElements] = useState([]);

  const setZoomSafe = (val) => {
    const clamped = Math.min(3, Math.max(0.3, Number(val)));
    setZoom(Number(clamped.toFixed(2)));
  };
  const handleZoomIn = () => setZoomSafe(zoom + 0.1);
  const handleZoomOut = () => setZoomSafe(zoom - 0.1);

  const handleWheelZoom = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomSafe(zoom + delta);
  };

  const handleMapMouseDown = (e) => {
    if (e.target === mapRef.current) {
      panInfo.current = {
        isPanning: true,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
      document.addEventListener('mousemove', handleMapMouseMove);
      document.addEventListener('mouseup', handleMapMouseUp);
    }
  };
  const handleMapMouseMove = (e) => {
    if (!panInfo.current.isPanning) return;
    const dx = e.clientX - panInfo.current.startMouseX;
    const dy = e.clientY - panInfo.current.startMouseY;
    setPan({ x: panInfo.current.startPanX + dx, y: panInfo.current.startPanY + dy });
  };
  const handleMapMouseUp = () => {
    panInfo.current.isPanning = false;
    document.removeEventListener('mousemove', handleMapMouseMove);
    document.removeEventListener('mouseup', handleMapMouseUp);
  };

  useEffect(() => {
    const fetchHallElements = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const url = `http://localhost:8001/tables/hall-elements/event/${eventId}?hall_type=${hallType}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setHallElements(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to load hall elements:', e);
      }
    };
    fetchHallElements();
  }, [eventId, hallType]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '95vw', height: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleZoomOut} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer' }}>-</button>
            <span style={{ minWidth: 60, textAlign: 'center', fontWeight: 600 }}>{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer' }}>+</button>
          </div>
          <button onClick={onClose} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>סגור</button>
        </div>
        <div 
          ref={mapRef}
          style={{ width: '100%', height: '100%', border: '2px solid #ccc', position: 'relative', backgroundColor: '#f9f9f9', overflow: 'hidden' }}
          onWheel={handleWheelZoom}
          onMouseDown={handleMapMouseDown}
        >
          <div
            style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
          >
            {/* Grid background */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`, backgroundSize: '50px 50px', pointerEvents: 'none' }} />

            {/* Hall elements (read-only) */}
            {hallElements.map((element) => (
              <div
                key={element.id}
                style={{
                  position: 'absolute',
                  left: element.x || 100,
                  top: element.y || 100,
                  width: element.width || (element.element_type === 'stage' ? 1200 : 40),
                  height: element.height || (element.element_type === 'stage' ? 200 : 100),
                  background: element.element_type === 'stage' ? '#fbbf24' : '#34d399',
                  borderRadius: element.element_type === 'stage' ? '12px' : '4px',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: element.element_type === 'stage' ? '24px' : '16px',
                  fontWeight: 700,
                  boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
                  textAlign: 'center',
                  padding: '20px',
                  userSelect: 'none',
                  border: element.element_type === 'stage' ? '5px solid #000' : '3px solid rgba(0,0,0,0.2)',
                  zIndex: 10,
                }}
              >
                <div>{element.name || (element.element_type === 'stage' ? 'במה' : '')}</div>
              </div>
            ))}

            {/* Tables */}
            {tables.map((table, idx) => (
              <div key={table.id || idx} style={{ position: 'absolute', left: table.x ?? 40, top: table.y ?? 40 }}>
                <TableVisual 
                  table={{ size: Number(table.size), shape: table.shape }} 
                  isDragging={false} 
                  isViewer={true} 
                  onMouseDown={() => {}} 
                  style={{ position: 'relative', zIndex: 1 }} 
                  tableNumber={table.table_number || table.id}
                  guests={Array.isArray(table.guests) ? table.guests : []}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 