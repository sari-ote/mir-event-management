import React, { useEffect, useRef, useState } from 'react';
import TableVisual from './TableVisual';
import { useDrop, useDrag } from 'react-dnd';

export default function HallMapInline({ eventId, hallType = 'm', tables = [], height = 600, availableCategories = [], canEditCategories = false, onChangeTableCategory = () => {}, onDropGuestToTable = () => {}, onDropCategory = () => {}, onAddSeat = () => {}, onRemoveSeat = () => {} }) {
  const mapRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panInfo = useRef({ isPanning: false, startMouseX: 0, startMouseY: 0, startPanX: 0, startPanY: 0 });
  const [hallElements, setHallElements] = useState([]);
  const [displayElements, setDisplayElements] = useState([]);
  const [contentSize, setContentSize] = useState({ width: 1600, height: 1000 });
  const [hoveredTableIdx, setHoveredTableIdx] = useState(null);
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, tableId: null });
  const [guestsList, setGuestsList] = useState({ open: false, tableId: null, table: null });

  const TABLE_SIZE = 120;
  const DEFAULT_STAGE = { width: 1200, height: 200 };
  const DEFAULT_ENTRANCE = { width: 40, height: 100 };
  const MARGIN = 60;

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

  // Close menu on outside click / ESC
  useEffect(() => {
    const onClick = (e) => {
      if (!menu.open) return;
      const menuEl = document.getElementById('table-menu-flyout');
      if (menuEl && !menuEl.contains(e.target)) setMenu({ open: false, x: 0, y: 0, tableId: null });
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenu({ open: false, x: 0, y: 0, tableId: null }); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [menu.open]);

  // Helpers for layout
  const rectsOverlap = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  const elementRect = (el) => {
    const w = Number(el.width) || (el.element_type === 'stage' ? DEFAULT_STAGE.width : DEFAULT_ENTRANCE.width);
    const h = Number(el.height) || (el.element_type === 'stage' ? DEFAULT_STAGE.height : DEFAULT_ENTRANCE.height);
    const x = Number(el.x) || 0;
    const y = Number(el.y) || 0;
    return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h };
  };

  useEffect(() => {
    // Compute canvas size from tables
    const maxTableX = tables.length ? Math.max(...tables.map(t => (Number(t.x) || 0))) + TABLE_SIZE : 0;
    const maxTableY = tables.length ? Math.max(...tables.map(t => (Number(t.y) || 0))) + TABLE_SIZE : 0;
    let width = Math.max(1600, maxTableX + 4 * MARGIN);
    let height = Math.max(1000, maxTableY + 4 * MARGIN);

    // Build table rects
    const tableRects = tables.map(t => ({
      left: Number(t.x) || 0,
      top: Number(t.y) || 0,
      right: (Number(t.x) || 0) + TABLE_SIZE,
      bottom: (Number(t.y) || 0) + TABLE_SIZE
    }));

    // Auto-place hall elements if overlapping tables or each other
    const placed = [];
    const isFree = (rect) => {
      const collideTable = tableRects.some(tr => rectsOverlap(rect, tr));
      if (collideTable) return false;
      const collidePlaced = placed.some(pr => rectsOverlap(rect, pr));
      return !collidePlaced;
    };

    const tryPlace = (w, h, preferred) => {
      const startX = preferred?.x ?? MARGIN;
      const startY = preferred?.y ?? MARGIN;
      const step = 40;
      for (let y = startY; y + h + MARGIN < height; y += step) {
        for (let x = startX; x + w + MARGIN < width; x += step) {
          const rect = { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h };
          if (isFree(rect)) return rect;
        }
      }
      // If no free spot in current canvas, extend and place
      const rect = { left: width - w - MARGIN, top: height - h - MARGIN, right: width - MARGIN, bottom: height - MARGIN, width: w, height: h };
      return rect;
    };

    // Sort to place stage first
    const sorted = [...hallElements].sort((a, b) => (a.element_type === 'stage' ? -1 : 1));
    const placedElements = sorted.map(raw => {
      const el = { ...raw };
      const w = Number(el.width) || (el.element_type === 'stage' ? DEFAULT_STAGE.width : DEFAULT_ENTRANCE.width);
      const h = Number(el.height) || (el.element_type === 'stage' ? DEFAULT_STAGE.height : DEFAULT_ENTRANCE.height);
      let rect = elementRect(el);

      // If colliding or outside canvas, find new spot
      const outside = rect.right + MARGIN > width || rect.bottom + MARGIN > height;
      const collideTables = tableRects.some(tr => rectsOverlap(rect, tr));
      const collideOthers = placed.some(pr => rectsOverlap(rect, pr));
      if (outside || collideTables || collideOthers) {
        if (el.element_type === 'stage') {
          // Prefer bottom area under tables
          rect = tryPlace(w, h, { x: MARGIN, y: maxTableY + MARGIN });
        } else {
          // Prefer left margin column
          rect = tryPlace(w, h, { x: MARGIN, y: MARGIN });
        }
      }
      placed.push(rect);
      return { ...el, x: rect.left, y: rect.top, width: w, height: h };
    });

    // Ensure canvas large enough for placed elements
    const maxElRight = placed.length ? Math.max(...placed.map(r => r.x + r.width)) : 0;
    const maxElBottom = placed.length ? Math.max(...placed.map(r => r.y + r.height)) : 0;
    width = Math.max(width, maxElRight + 2 * MARGIN);
    height = Math.max(height, maxElBottom + 2 * MARGIN);

    setDisplayElements(placedElements);
    setContentSize({ width, height });

    // Default zoom 100%
    setZoomSafe(1);
    setPan({ x: 0, y: 0 });
  }, [hallElements, tables, hallType]);

  // Draggable guest chip
  const GuestChip = ({ guest }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: 'GUEST',
      item: { ...guest },
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() })
    }), [guest]);
    const displayName = (
      guest.full_name ||
      guest.name ||
      guest["שם מלא"] ||
      [guest["שם"], guest["שם משפחה"]].filter(Boolean).join(' ') ||
      [guest["שם פרטי"], guest["שם משפחה"]].filter(Boolean).join(' ') ||
      [guest.first_name, guest.last_name].filter(Boolean).join(' ') ||
      [guest.firstName, guest.lastName].filter(Boolean).join(' ') ||
      guest["טלפון"] ||
      guest.phone ||
      (guest.id ? `#${guest.id}` : 'ללא שם')
    );
    return (
      <span
        ref={drag}
        style={{
          display: 'inline-block',
          background: isDragging ? '#4f8cff' : '#fff',
          color: isDragging ? '#fff' : '#222',
          borderRadius: 12,
          padding: '2px 8px',
          margin: '0 4px 4px 0',
          fontSize: 11,
          boxShadow: '0 1px 3px #0002',
          cursor: 'grab',
          border: '1px solid #cfe1ff'
        }}
      >
        {displayName}
      </span>
    );
  };

  // Child component to satisfy hooks rules
  const TableCell = ({ table }) => {
    const [hover, setHover] = useState(false);
    const left = table.x ?? 40;
    const top = table.y ?? 40;
    const categoryValue = table.category || '';

    const [{ isOver }, drop] = useDrop(() => ({
      accept: ['CATEGORY', 'GUEST'],
      drop: (item) => {
        if (item?.category) {
          onChangeTableCategory(table.id, item.category);
          onDropCategory(table, item.category);
        } else if (item?.id) {
          onDropGuestToTable(table, item);
        }
      },
      collect: (monitor) => ({ isOver: !!monitor.isOver() })
    }), [table.id, categoryValue, onChangeTableCategory, onDropCategory, onDropGuestToTable]);

    const [{ isDragging }, drag] = useDrag(() => ({
      type: 'TABLE_CATEGORY',
      item: { tableId: table.id, category: categoryValue },
      canDrag: () => Boolean(categoryValue),
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() })
    }), [table.id, categoryValue]);

    const openMenu = (e) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      setMenu({ open: true, x: rect.left + rect.width / 2, y: rect.top, tableId: table.id });
    };

    return (
      <div
        ref={drop}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={openMenu}
        style={{ position: 'absolute', left, top }}
      >
        {/* Category visual handled within TableVisual */}

        {/* Fixed-size table box to anchor badges inside the table */}
        <div style={{ position: 'relative', width: TABLE_SIZE, height: TABLE_SIZE }}>
          <TableVisual
            table={{ ...table, size: Number(table.size) }}
            guests={Array.isArray(table.guests) ? table.guests : []}
            isDragging={false}
            isViewer={true}
            onMouseDown={() => {}}
            style={{ position: 'relative', zIndex: 1, outline: isOver ? '3px dashed #10b981' : 'none', outlineOffset: 2, cursor: 'pointer' }}
            label={`${table.occupied || 0}/${table.size}`}
            categoryLabel={categoryValue}
            tableNumber={table.table_number || table.id}
          />

          {/* Overflow indicator: show +N inside the table (top-right) */}
          {Number(table.occupied || 0) > Number(table.size || 0) && (
            <div className="table-overflow-indicator">
              {`+${Number(table.occupied) - Number(table.size)}`}
            </div>
          )}
        </div>
      </div>
    );
  };

  const MenuFlyout = () => {
    if (!menu.open || !menu.tableId) return null;
    const currentTable = tables.find(t => t.id === menu.tableId);
    return (
      <div className="table-menu-flyout" style={{ left: menu.x, top: menu.y - 8 }}>
        <div className="table-menu-header">תפריט שולחן</div>
        <button onClick={() => { setGuestsList({ open: true, tableId: menu.tableId, table: currentTable }); setMenu({ open: false, x: 0, y: 0, tableId: null }); }} className="table-menu-item">
          <span className="table-menu-icon guests">👥</span>
          <span className="table-menu-text">הצגת המוזמנים</span>
        </button>
        <button onClick={() => { onAddSeat(menu.tableId); setMenu({ open: false, x: 0, y: 0, tableId: null }); }} className="table-menu-item">
          <span className="table-menu-icon add">+</span>
          <span className="table-menu-text">הוספת כיסא</span>
        </button>
        <button onClick={() => { onRemoveSeat(menu.tableId); setMenu({ open: false, x: 0, y: 0, tableId: null }); }} className="table-menu-item">
          <span className="table-menu-icon remove">-</span>
          <span className="table-menu-text">הורדת כיסא</span>
        </button>
        {canEditCategories && (
          <div className="table-menu-category-section">
            <div className="table-menu-category-label">בחירת קטגוריה</div>
            <select onChange={(e) => { onChangeTableCategory(menu.tableId, e.target.value); setMenu({ open: false, x: 0, y: 0, tableId: null }); }} defaultValue="" className="table-menu-category-select">
              <option value="">ללא</option>
              {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };

  const getDisplayName = (guest) => (
    guest?.full_name ||
    guest?.name ||
    guest?.["שם מלא"] ||
    [guest?.["שם"], guest?.["שם משפחה"]].filter(Boolean).join(' ') ||
    [guest?.["שם פרטי"], guest?.["שם משפחה"]].filter(Boolean).join(' ') ||
    [guest?.first_name, guest?.last_name].filter(Boolean).join(' ') ||
    [guest?.firstName, guest?.lastName].filter(Boolean).join(' ') ||
    guest?.["טלפון"] ||
    guest?.phone ||
    (guest?.id ? `#${guest.id}` : '')
  );

  const GuestsListModal = () => {
    if (!guestsList.open || !guestsList.table) return null;
    
    const table = guestsList.table;
    const guests = Array.isArray(table.guests) ? table.guests : [];
    const chairCount = Math.max(1, Number(table.size) || 12);
    const safeTableNumber = table.table_number || table.id;

    return (
      <div 
        className="modal-overlay"
        onClick={() => setGuestsList({ open: false, tableId: null, table: null })}
      >
        <div 
          className="modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h4 className="modal-title">
              הצגת המוזמנים לשולחן {safeTableNumber}
            </h4>
            <button
              className="modal-close-button"
              onClick={() => setGuestsList({ open: false, tableId: null, table: null })}
            >
              ✕
            </button>
          </div>
          
          <div className="modal-content">
            {guests && guests.length > 0 ? (
              guests.map((guest, index) => (
                <div key={index} className="guest-list-item">
                  <span className="guest-number">
                    {index + 1}
                  </span>
                  <div className="guest-info">
                    <div className="guest-name">
                      {getDisplayName(guest) || `אורח ${index + 1}`}
                    </div>
                    {guest?.phone && (
                      <div className="guest-contact">
                        📞 {guest.phone}
                      </div>
                    )}
                    {guest?.email && (
                      <div className="guest-contact">
                        ✉️ {guest.email}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🪑</div>
                <div className="empty-state-title">אין מוזמנים בשולחן זה</div>
                <div className="empty-state-subtitle">השולחן ריק</div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <div className="modal-stats">
              <span className="modal-stat">
                סה"כ מוזמנים: <span className="modal-stat-value">{guests.length}</span>
              </span>
              <span className="modal-stat">
                מקומות פנויים: <span className="modal-stat-value accent">{chairCount - guests.length}</span>
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill"
                style={{ width: `${Math.min(100, (guests.length / chairCount) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="hall-map-container" style={{ height }}>
      <div className="zoom-controls">
        <button onClick={handleZoomOut} className="zoom-button">-</button>
        <span className="zoom-display">{Math.round(zoom * 100)}%</span>
        <button onClick={handleZoomIn} className="zoom-button">+</button>
      </div>
      <div 
        ref={mapRef}
        className="map-viewport"
        onWheel={handleWheelZoom}
        onMouseDown={handleMapMouseDown}
      >
        <div
          style={{ position: 'absolute', left: 0, top: 0, width: `${contentSize.width}px`, height: `${contentSize.height}px`, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          {/* Grid background */}
          <div className="grid-background" />

          {/* Hall elements (auto-placed, read-only) */}
          {displayElements.map((element) => (
            <div
              key={element.id}
              className={`hall-element ${element.element_type}`}
              style={{
                left: element.x || 100,
                top: element.y || 100,
                width: element.width || (element.element_type === 'stage' ? DEFAULT_STAGE.width : DEFAULT_ENTRANCE.width),
                height: element.height || (element.element_type === 'stage' ? DEFAULT_STAGE.height : DEFAULT_ENTRANCE.height),
                background: element.element_type === 'stage' ? '#fbbf24' : '#34d399',
                borderRadius: element.element_type === 'stage' ? '12px' : '4px',
                fontSize: element.element_type === 'stage' ? '24px' : '16px',
                boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
                transform: element.rotation ? `rotate(${element.rotation}deg)` : 'none'
              }}
            >
              <div>{element.name || (element.element_type === 'stage' ? 'במה' : '')}</div>
            </div>
          ))}

          {/* Tables with category selector and DnD */}
          {tables.map((table) => (
            <TableCell key={table.id || `${table.x}-${table.y}`} table={table} />
          ))}
        </div>
        <MenuFlyout />
        <GuestsListModal />
      </div>
    </div>
  );
} 