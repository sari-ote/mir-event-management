import React, { useState, useEffect, useCallback, useRef } from 'react';
import TableVisual from '../TableVisual.jsx';
import { useParams } from "react-router-dom";

export default function EventSettingsTab({ eventId }) {
  console.log('EventSettingsTab: eventId from props:', eventId);
  console.log('EventSettingsTab: eventId type:', typeof eventId);
  console.log('EventSettingsTab: eventId value:', eventId);
  const [activeHallTab, setActiveHallTab] = useState('m'); // התחל עם אולם גברים
  const [tableTypes, setTableTypes] = useState([]);
  const [newTable, setNewTable] = useState({ size: "", count: "", shape: "circular" });
  const [showMap, setShowMap] = useState(false);
  const [tablePositions, setTablePositions] = useState([]);
  const [tables, setTables] = useState([]); // raw tables from server
  const [availableCategories, setAvailableCategories] = useState([]); // categories per hall
  const [tableCategories, setTableCategories] = useState([]); // by index
  const [hoveredTableIdx, setHoveredTableIdx] = useState(null); // הצגת בחירת קטגוריה רק בהובר
  
  // HallElement state
  const [hallElements, setHallElements] = useState([]);
  const [newHallElement, setNewHallElement] = useState({ 
    name: "", 
    element_type: "stage", 
    width: "", 
    height: "" 
  });
  
  // Drag and drop state for all elements
  const [draggedElement, setDraggedElement] = useState(null);
  const [draggedElementType, setDraggedElementType] = useState(null); // 'table' or 'hall_element'
  const [draggedElementId, setDraggedElementId] = useState(null);
  
  // Resize and rotate state for hall elements
  const [resizingElement, setResizingElement] = useState(null);
  const [rotatingElement, setRotatingElement] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, zoomAtStart: 1 });
  const [rotateStart, setRotateStart] = useState({ x: 0, y: 0, angle: 0 });
  const [hoveredHallElementId, setHoveredHallElementId] = useState(null);
  const hoverTimeoutRef = useRef(null);
  
  const dragInfo = useRef({ idx: null, offsetX: 0, offsetY: 0 });
  const draggedElementIdRef = useRef(null); // שמירת ה-ID של האלמנט הנגרר
  const mapRef = useRef(null); // ref לקונטיינר של מפת האולם לחישובי מיקום מדויקים
  const [zoom, setZoom] = useState(1); // זום המפה
  const [pan, setPan] = useState({ x: 0, y: 0 }); // הזזה של כל המפה
  const panInfo = useRef({ isPanning: false, startMouseX: 0, startMouseY: 0, startPanX: 0, startPanY: 0 });
  const [loading, setLoading] = useState(true);
  const role = localStorage.getItem("role");
  const isViewer = role === "viewer";
  
  // פונקציות שליטה בזום
  const setZoomSafe = (val) => {
    const clamped = Math.min(3, Math.max(0.3, Number(val)));
    setZoom(Number(clamped.toFixed(2)));
  };
  const handleZoomIn = () => setZoomSafe(zoom + 0.1);
  const handleZoomOut = () => setZoomSafe(zoom - 0.1);
  const handleWheelZoom = (e) => {
    if (!e.ctrlKey && !e.metaKey) return; // זום רק עם Ctrl/⌘ כדי לא להפריע לגלילה רגילה
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomSafe(zoom + delta);
  };
  const handleMapMouseDown = (e) => {
    // התחלת פאן כשנלחץ על הרקע של המפה
    if (e.target === mapRef.current && !isViewer) {
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

  console.log('🎭 Current role:', role);
  console.log('🎭 Is viewer:', isViewer);
  console.log('🎭 Can drag elements:', !isViewer);

  // טעינה ראשונית פשוטה
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8001/tables/event/${eventId}?hall_type=${activeHallTab}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          console.log('Initial load - Fetched tables:', data);
          console.log('Initial load - Number of tables:', data.length);
          console.log('Initial load - Event ID:', eventId);
          console.log('Initial load - Hall type:', activeHallTab);
          
          // Debug each table
          data.forEach((table, index) => {
            console.log(`Table ${index + 1}:`, {
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
          
          setTables(Array.isArray(data) ? data : []);
          setTableCategories((Array.isArray(data) ? data : []).map(t => t.category || ''));
          
          // קיבוץ לפי size ו-shape
          const typeMap = {};
          data.forEach(t => {
            console.log('Processing table for typeMap:', t);
            
            // Handle null/undefined size by using a default value instead of skipping
            let tableSize = t.size;
            if (tableSize === null || tableSize === undefined || isNaN(Number(tableSize))) {
              console.warn('Table has invalid size, using default size 4:', t);
              tableSize = 4; // Use default size instead of skipping
            }
            
            const key = `${tableSize}_${t.shape || 'circular'}`;
            if (!typeMap[key]) typeMap[key] = { size: Number(tableSize), count: 0, shape: t.shape || 'circular' };
            typeMap[key].count++;
          });
          const types = Object.values(typeMap);
          console.log('Initial load - Grouped table types:', types);
          setTableTypes(types);
          
          // טען מיקומים
          const serverPositions = data.map(t => ({ x: t.x, y: t.y }));
          setTablePositions(serverPositions);
        }
      } catch (error) {
        console.error('Error in initial load:', error);
      }
    };
    
    loadInitialData();
  }, [eventId, activeHallTab]);

  // טען אלמנטי אולם
  useEffect(() => {
    async function fetchHallElements() {
      try {
        console.log('Fetching hall elements for event:', eventId, 'hall type:', activeHallTab);
        const token = localStorage.getItem('access_token');
        const url = `http://localhost:8001/tables/hall-elements/event/${eventId}?hall_type=${activeHallTab}`;
        console.log('Fetching from URL:', url);
        
        // בדיקה פשוטה אם השרת רץ
        try {
          const healthCheck = await fetch('http://localhost:8001/docs', { method: 'GET' });
          console.log('Backend health check status:', healthCheck.status);
        } catch (healthError) {
          console.error('Backend health check failed:', healthError);
        }
        
        const res = await fetch(url, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        console.log('Hall elements response status:', res.status);
        console.log('Hall elements response ok:', res.ok);
        
        if (res.ok) {
          const data = await res.json();
          console.log('🎭 Fetched hall elements from server:', data);
          console.log('🎭 Stage dimensions from server:', data.filter(el => el.element_type === 'stage').map(el => ({ id: el.id, width: el.width, height: el.height, x: el.x, y: el.y })));
          console.log('🎭 All hall elements details:', data.map(el => ({ id: el.id, type: el.element_type, width: el.width, height: el.height, x: el.x, y: el.y })));
          
          // טען מיקומים מ-localStorage אם יש
          const localStorageKey = `hallElementPositions_${eventId}_${activeHallTab}`;
          const savedPositions = localStorage.getItem(localStorageKey);
          
          if (savedPositions && data.length > 0) {
            try {
              const parsedPositions = JSON.parse(savedPositions);
              console.log('🎭 Found saved hall element positions:', parsedPositions);
              
              // עדכן את הנתונים עם המיקומים השמורים
              const updatedData = data.map(element => {
                const savedPosition = parsedPositions.find(pos => pos.id === element.id);
                if (savedPosition) {
                  return {
                    ...element,
                    x: savedPosition.x,
                    y: savedPosition.y,
                    width: savedPosition.width || element.width,
                    height: savedPosition.height || element.height,
                    rotation: savedPosition.rotation || element.rotation
                  };
                }
                return element;
              });
              
              // אם יש חפיפות/חוסרים — הפעל שיבוץ אוטומטי
              if (hasHallElementsOverlap(updatedData)) {
                const autoLayout = computeHallElementsAutoLayout(updatedData);
                console.log('🎭 Auto layout hall elements applied');
                setHallElements(autoLayout);
              } else {
                console.log('🎭 Updated hall elements with saved positions:', updatedData);
                setHallElements(updatedData);
              }
            } catch (error) {
              console.error('🎭 Error parsing saved hall element positions:', error);
              // ללא localStorage תקין – השתמש בנתוני השרת ושבץ אם צריך
              if (hasHallElementsOverlap(data)) {
                const autoLayout = computeHallElementsAutoLayout(data);
                setHallElements(autoLayout);
              } else {
          setHallElements(data);
              }
            }
          } else {
            console.log('�� No saved positions found, using server data');
            if (hasHallElementsOverlap(data)) {
              const autoLayout = computeHallElementsAutoLayout(data);
              setHallElements(autoLayout);
            } else {
              setHallElements(data);
            }
          }
        } else {
          console.error('Failed to fetch hall elements. Status:', res.status);
          const errorText = await res.text();
          console.error('Error response:', errorText);
        }
      } catch (error) {
        console.error('Error fetching hall elements:', error);
      }
    }
    fetchHallElements();
  }, [eventId, activeHallTab]);

  // שמירה אוטומטית לשרת בכל שינוי
  useEffect(() => {
    if (loading) return;
    
    // אל תנסה לשמור אם אין שולחנות
    if (tableTypes.length === 0) return;
    
    // אל תנסה לשמור בזמן גרירה פעילה
    if (draggedElementType !== null) {
      console.log('Skipping save - active dragging in progress');
      return;
    }
    
    // מניעת שמירה כפולה
    const saveKey = JSON.stringify({ tableTypes, tablePositions, activeHallTab });
    console.log('=== SAVE PREVENTION DEBUG ===');
    console.log('Current saveKey:', saveKey);
    console.log('Last saveKey:', window.lastSaveKey);
    console.log('Keys match:', window.lastSaveKey === saveKey);
    
    if (window.lastSaveKey === saveKey) {
      console.log('Skipping save - same data already saved');
      return;
    }
    
    console.log('Proceeding with save...');
    
    const saveTables = async () => {
      try {
        // בדיקת תקינות הנתונים לפני שליחה
        console.log('=== DEBUG INFO ===');
        console.log('Current Hall Type:', activeHallTab);
        console.log('Event ID:', eventId);
        console.log('Table Types:', tableTypes);
        console.log('Table Positions:', tablePositions);
        console.log('Loading State:', loading);
        
        // בדוק אם יש שולחנות קיימים
        const token = localStorage.getItem('access_token');
        const existingTablesResponse = await fetch(`http://localhost:8001/tables/event/${eventId}?hall_type=${activeHallTab}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const existingTables = await existingTablesResponse.json();
        
        // בדוק אם יש שינוי משמעותי
        const currentTableConfig = tableTypes.map(t => ({ size: t.size, count: t.count }));
        const existingTableConfig = [];
        
        // יצירת קונפיגורציה מהשולחנות הקיימים
        const sizeCount = {};
        existingTables.forEach(table => {
          sizeCount[table.size] = (sizeCount[table.size] || 0) + 1;
        });
        Object.entries(sizeCount).forEach(([size, count]) => {
          existingTableConfig.push({ size: parseInt(size), count });
        });
        
        // השוואה בין הקונפיגורציות
        const configChanged = JSON.stringify(currentTableConfig.sort()) !== JSON.stringify(existingTableConfig.sort());
        
        // בדוק אם יש שינוי במיקומים
        const positionsChanged = existingTables.length !== tablePositions.length || 
          existingTables.some((table, index) => {
            const currentPos = tablePositions[index];
            return !currentPos || table.x !== currentPos.x || table.y !== currentPos.y;
          });
        
        // בדוק אם יש שינוי בקטגוריות
        const categoriesChanged = existingTables.length !== tableCategories.length ||
          existingTables.some((table, index) => {
            const curr = (tableCategories[index] || '');
            const prev = (table.category || '');
            return curr !== prev;
          });
        
        console.log('Current config:', currentTableConfig);
        console.log('Existing config:', existingTableConfig);
        console.log('Config changed:', configChanged);
        console.log('Positions changed:', positionsChanged);
        console.log('Categories changed:', categoriesChanged);
        
        // אם אין שינוי משמעותי ואין שינוי במיקומים ואין שינוי בקטגוריות, אל תשלח בקשה
        if (!configChanged && !positionsChanged && !categoriesChanged && existingTables.length > 0) {
          console.log('No significant change detected, skipping save');
          return;
        }
        
        // בדוק אם זה שינוי קטן (הוספה או מחיקה של שולחן אחד)
        // במקום לבדוק רק את הסכום הכולל, נבדוק אם רק סוג אחד השתנה ב-+1 או -1
        let changedTypes = [];
        let isSmallChange = false;
        
        // בדוק איזה סוגים השתנו
        currentTableConfig.forEach(current => {
          const existing = existingTableConfig.find(e => e.size === current.size);
          if (!existing) {
            // סוג חדש שנוסף
            changedTypes.push({ type: 'add', size: current.size, count: current.count });
          } else if (existing.count !== current.count) {
            // סוג קיים שהשתנה
            changedTypes.push({ 
              type: 'change', 
              size: current.size, 
              oldCount: existing.count, 
              newCount: current.count 
            });
          }
        });
        
        // בדוק איזה סוגים נמחקו
        existingTableConfig.forEach(existing => {
          const current = currentTableConfig.find(c => c.size === existing.size);
          if (!current) {
            // סוג שנמחק
            changedTypes.push({ type: 'remove', size: existing.size, count: existing.count });
          }
        });
        
        console.log('Current table config:', currentTableConfig);
        console.log('Existing table config:', existingTableConfig);
        console.log('Changed types:', changedTypes);
        
        // בדוק אם זה שינוי קטן (רק סוג אחד השתנה ב-+1 או -1)
        if (changedTypes.length === 1) {
          const change = changedTypes[0];
          if (change.type === 'add' || change.type === 'remove') {
            // שינוי קטן רק אם מוסיפים/מסירים שולחן אחד בדיוק
            isSmallChange = Number(change.count) === 1;
          } else if (change.type === 'change') {
            // שינוי בכמות של סוג קיים
            const diff = Math.abs(change.newCount - change.oldCount);
            isSmallChange = diff === 1;
          }
        }
        
        // אם יש שינוי קטן, תמיד תשלח add-single/remove-single
        if (isSmallChange && !positionsChanged) {
          console.log('Processing as small change');
          // טיפול בשינוי קטן - הוספה או מחיקה של שולחן אחד
          const change = changedTypes[0];
          
          if (change.type === 'add' || (change.type === 'change' && change.newCount > change.oldCount)) {
            console.log('Adding one table');
            // הוספת שולחן אחד
            const inferredShape = (tableTypes.find(t => Number(t.size) === Number(change.size))?.shape) || 'circular';
            const calcX = 40 + (existingTables.length % 6) * 120;
            const calcY = 40 + Math.floor(existingTables.length / 6) * 120;
            const nextTableNumber = (existingTables.length > 0)
              ? Math.max(...existingTables.map(t => Number(t.table_number) || 0)) + 1
              : 1;
            const newTable = {
              event_id: Number(eventId),
              table_number: Number(nextTableNumber),
              size: Number(change.size),
              shape: inferredShape,
              x: Math.round(calcX),
              y: Math.round(calcY),
              table_head: null,
              category: null,
              hall_type: activeHallTab,
            };
            
            console.log('Adding single table:', newTable);
            
            const response = await fetch(`http://localhost:8001/tables/event/${eventId}/add-single`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify(newTable),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Add-single server error:', errorText);
              alert(`שגיאה בהוספת שולחן: ${response.status} - ${errorText}`);
              // סנכרון מחדש כדי לא להשאיר UI שונה מהשרת
              try {
                const resSync = await fetch(`http://localhost:8001/tables/event/${eventId}?hall_type=${activeHallTab}`, {
                  headers: { "Authorization": `Bearer ${token}` }
                });
                if (resSync.ok) {
                  const dataSync = await resSync.json();
                  const typeMapSync = {};
                  dataSync.forEach(t => {
                    const key = `${t.size}_${t.shape || 'circular'}`;
                    if (!typeMapSync[key]) typeMapSync[key] = { size: t.size, count: 0, shape: t.shape || 'circular' };
                    typeMapSync[key].count++;
                  });
                  setTables(Array.isArray(dataSync) ? dataSync : []);
                  setTableTypes(Object.values(typeMapSync));
                }
              } catch (e) {
                console.error('Resync after add-single failure failed:', e);
              }
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Single table added successfully:', data);
            // סנכרון מצב מהשרת אחרי הצלחה
            try {
              const resSync = await fetch(`http://localhost:8001/tables/event/${eventId}?hall_type=${activeHallTab}`, {
                headers: { "Authorization": `Bearer ${token}` }
              });
              if (resSync.ok) {
                const dataSync = await resSync.json();
                setTables(Array.isArray(dataSync) ? dataSync : []);
                const typeMapSync = {};
                dataSync.forEach(t => {
                  // Handle null/undefined size by using a default value instead of skipping
                  let tableSize = t.size;
                  if (tableSize === null || tableSize === undefined || isNaN(Number(tableSize))) {
                    console.warn('Table has invalid size during sync, using default size 4:', t);
                    tableSize = 4; // Use default size instead of skipping
                  }
                  const key = `${tableSize}_${t.shape || 'circular'}`;
                  if (!typeMapSync[key]) typeMapSync[key] = { size: Number(tableSize), count: 0, shape: t.shape || 'circular' };
                  typeMapSync[key].count++;
                });
                setTableTypes(Object.values(typeMapSync));
                const serverPositions = dataSync.map(t => ({ x: t.x, y: t.y }));
                setTablePositions(serverPositions);
              }
            } catch (e) {
              console.error('Resync after add-single success failed:', e);
            }
          } else if (change.type === 'remove' || (change.type === 'change' && change.newCount < change.oldCount)) {
            console.log('Removing one table');
            // מחיקת שולחן אחד
            const tableToRemove = existingTables.find(t => t.size === change.size);
            if (tableToRemove) {
              const response = await fetch(`http://localhost:8001/tables/${tableToRemove.id}`, {
                method: "DELETE",
                headers: { 
                  "Authorization": `Bearer ${token}`
                }
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              console.log('Single table removed successfully:', data);
              // סנכרון מצב מהשרת אחרי הצלחה
              try {
                const resSync = await fetch(`http://localhost:8001/tables/event/${eventId}?hall_type=${activeHallTab}`, {
                  headers: { "Authorization": `Bearer ${token}` }
                });
                if (resSync.ok) {
                  const dataSync = await resSync.json();
                  setTables(Array.isArray(dataSync) ? dataSync : []);
                  const typeMapSync = {};
                  dataSync.forEach(t => {
                    const key = `${t.size}_${t.shape || 'circular'}`;
                    if (!typeMapSync[key]) typeMapSync[key] = { size: t.size, count: 0, shape: t.shape || 'circular' };
                    typeMapSync[key].count++;
                  });
                  setTableTypes(Object.values(typeMapSync));
                  const serverPositions = dataSync.map(t => ({ x: t.x, y: t.y }));
                  setTablePositions(serverPositions);
                }
              } catch (e) {
                console.error('Resync after remove-single success failed:', e);
              }
            }
          }
        } else {
          console.log('Processing as bulk change - simple approach');
          // שינוי גדול - שלח את כל השולחנות
          const tablesPayload = [];
          let tableIndex = 0;
          
          // יצירת שולחנות לפי סוגים וכמות
          tableTypes.forEach(tableType => {
            const tableSize = Number(tableType.size);
            const tableCount = Number(tableType.count);
            
            if (isNaN(tableSize) || isNaN(tableCount) || tableSize < 1 || tableCount < 1) {
              console.error('Invalid table type data:', tableType);
              throw new Error(`Invalid table type: size=${tableType.size}, count=${tableType.count}`);
            }
            
            for (let i = 0; i < tableCount; i++) {
              const savedPosition = tablePositions[tableIndex];
              let x, y;
              
              if (savedPosition && typeof savedPosition.x === 'number' && typeof savedPosition.y === 'number') {
                x = savedPosition.x;
                y = savedPosition.y;
              } else {
                x = 40 + (tableIndex % 6) * 120;
                y = 40 + Math.floor(tableIndex / 6) * 120;
              }
              
              const tableData = {
                event_id: Number(eventId),
                table_number: tableIndex + 1,
                size: tableSize,
                shape: tableType.shape || 'circular',
                x: Math.round(x),
                y: Math.round(y),
                table_head: null,
                category: (tableCategories[tableIndex] || '') || null,
                hall_type: activeHallTab,
              };
              
              tablesPayload.push(tableData);
              tableIndex++;
            }
          });

          const url = `http://localhost:8001/tables/event/${eventId}/bulk?hall_type=${activeHallTab}`;
          console.log('Sending bulk request to:', url);
          console.log('Request body:', JSON.stringify(tablesPayload, null, 2));
          console.log('Event ID:', eventId);
          console.log('Hall type:', activeHallTab);
          console.log('Number of tables to save:', tablesPayload.length);

          const response = await fetch(url, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(tablesPayload),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
          }

          const data = await response.json();
        }
        
        // שמור את המפתח של השמירה הנוכחית
        window.lastSaveKey = saveKey;
        
      } catch (error) {
        console.error('Error saving tables:', error);
        alert(`שגיאה בשמירת השולחנות: ${error.message}`);
        // סנכרון מחדש מהשרת כדי ליישר בין הפרונט לשרת
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`http://localhost:8001/tables/event/${eventId}?hall_type=${activeHallTab}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const typeMap = {};
            data.forEach(t => {
              const key = `${t.size}_${t.shape || 'circular'}`;
              if (!typeMap[key]) typeMap[key] = { size: t.size, count: 0, shape: t.shape || 'circular' };
              typeMap[key].count++;
            });
            const types = Object.values(typeMap);
            setTableTypes(types);
            const serverPositions = data.map(t => ({ x: t.x, y: t.y }));
            setTablePositions(serverPositions);
            // נקה שמירה אחרונה כדי לא לחסום שמירות עתידיות
            window.lastSaveKey = null;
          }
        } catch (syncErr) {
          console.error('Failed to resync tables after error:', syncErr);
        }
      }
    };

    // הוסף השהייה קצרה לפני שמירה כדי למנוע שליחות מרובות
    const timeoutId = setTimeout(saveTables, 500);
    return () => clearTimeout(timeoutId);
  }, [tableTypes, tablePositions, activeHallTab, eventId, loading, tableCategories]);

  // שמירה אוטומטית של מיקומי השולחנות ב-localStorage
  useEffect(() => {
    if (tablePositions.length > 0 && !loading) {
      // עגל את כל המיקומים למספרים שלמים
      const roundedPositions = tablePositions.map(pos => ({
        x: Math.round(pos.x || 0),
        y: Math.round(pos.y || 0)
      }));
      
      const localStorageKey = `tablePositions_${eventId}_${activeHallTab}`;
      localStorage.setItem(localStorageKey, JSON.stringify(roundedPositions));
      console.log('Saved rounded table positions to localStorage:', roundedPositions);
    }
  }, [tablePositions, eventId, activeHallTab, loading]);

  // שמירה אוטומטית של מיקומי אלמנטי האולם ב-localStorage
  useEffect(() => {
    if (hallElements.length > 0 && !loading) {
      const localStorageKey = `hallElementPositions_${eventId}_${activeHallTab}`;
      const positionsToSave = hallElements.map(el => ({
        id: el.id,
        x: Math.round(el.x || 0),
        y: Math.round(el.y || 0),
        width: Math.round(el.width || 0),
        height: Math.round(el.height || 0),
        rotation: el.rotation || 0
      }));
      localStorage.setItem(localStorageKey, JSON.stringify(positionsToSave));
      console.log('🎭 Saved hall element positions to localStorage:', positionsToSave);
    }
  }, [hallElements, eventId, activeHallTab, loading]);

  // שמירה אוטומטית בשרת של כל שינוי באלמנטי האולם
  useEffect(() => {
    if (loading || hallElements.length === 0) return;
    
    // אל תנסה לשמור בזמן גרירה פעילה
    if (draggedElementType === 'hall_element' || resizingElement || rotatingElement) {
      console.log('🎭 Skipping save - active manipulation in progress');
      return;
    }
    
    // מניעת שמירה כפולה
    const saveKey = JSON.stringify(hallElements.map(el => ({ id: el.id, x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation })));
    console.log('🎭 Hall elements save key:', saveKey);
    console.log('🎭 Last save key:', window.lastHallElementsSaveKey);
    
    if (window.lastHallElementsSaveKey === saveKey) {
      console.log('🎭 Skipping hall elements save - same data already saved');
      return;
    }
    
    console.log('🎭 Proceeding with hall elements save to server...');
    
    const saveHallElements = async () => {
      try {
        // שמור כל אלמנט בנפרד בשרת
        const token = localStorage.getItem('access_token');
        const savePromises = hallElements.map(async (element) => {
          const response = await fetch(`http://localhost:8001/tables/hall-elements/${element.id}`, {
            method: "PUT",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              x: Math.round(element.x || 0),
              y: Math.round(element.y || 0),
              width: Math.round(element.width || 0),
              height: Math.round(element.height || 0),
              rotation: element.rotation || 0
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to save element ${element.id}: ${response.status}`);
          }
          
          return response.json();
        });
        
        await Promise.all(savePromises);
        console.log('🎭 All hall elements saved successfully to server');
        
        // שמור את המפתח של השמירה הנוכחית
        window.lastHallElementsSaveKey = saveKey;
        
      } catch (error) {
        console.error('🎭 Error saving hall elements to server:', error);
        alert(`שגיאה בשמירת אלמנטי האולם: ${error.message}`);
      }
    };
    
    // הוסף השהייה קצרה לפני שמירה כדי למנוע שליחות מרובות
    const timeoutId = setTimeout(saveHallElements, 1000);
    return () => clearTimeout(timeoutId);
    
  }, [hallElements, eventId, activeHallTab, loading, draggedElementType, resizingElement, rotatingElement]);

  // הוספת סוג שולחן
  const handleAddTableType = () => {
    // בדיקות תקינות מחמירות יותר
    const size = Number(newTable.size);
    const count = Number(newTable.count);
    
    if (!newTable.size || !newTable.count || 
        isNaN(size) || isNaN(count) || 
        size < 1 || count < 1) {
      alert('אנא הזן גודל שולחן וכמות תקינים (מספרים גדולים מ-0)');
      return;
    }
    
    console.log('Adding new table type:', { ...newTable, hall_type: activeHallTab });
    setTableTypes(prev => {
      const updated = [...prev, { 
        size: size, // שמור כמספר ולא כמחרוזת
        count: count, // שמור כמספר ולא כמחרוזת
        shape: newTable.shape 
      }];
      console.log('Updated table types:', updated);
      return updated;
    });
    setNewTable({ size: "", count: "", shape: "circular" });
  };

  // מחיקת סוג שולחן
  const handleRemove = idx => {
    console.log('Removing table type at index:', idx, 'from hall:', activeHallTab);
    setTableTypes(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      console.log('Updated table types after removal:', updated);
      return updated;
    });
  };

  // גרירה של שולחנות
  const handleTableMouseDown = (e, idx) => {
    if (isViewer) return;
    console.log('Starting drag for table:', idx, 'in hall:', activeHallTab);
    // שמירת נקודת התחלה במסך ושמירת המיקום הנוכחי במרחב המפה (world)
    const currentPos = tablePositions[idx] || { x: 40 + (idx % 8) * 140, y: 40 + Math.floor(idx / 8) * 140 };
    dragInfo.current = {
      idx,
      mouseStartX: e.clientX,
      mouseStartY: e.clientY,
      startX: currentPos.x || 0,
      startY: currentPos.y || 0,
    };
    setDraggedElementType('table');
    setDraggedElementId(idx);
    document.addEventListener("mousemove", handleTableMouseMove);
    document.addEventListener("mouseup", handleTableMouseUp);
  };

  const handleTableMouseMove = e => {
    const { idx, mouseStartX, mouseStartY, startX, startY } = dragInfo.current;
    if (idx === null) return;
    // המפה מוגדלת/מוקטנת; תרגם תזוזה במסך למרחב המפה באמצעות חלוקה ב-zoom
    const dx = (e.clientX - mouseStartX) / (zoom || 1);
    const dy = (e.clientY - mouseStartY) / (zoom || 1);
    const x = startX + dx;
    const y = startY + dy;
    setTablePositions(pos => {
      const newPos = [...pos];
      newPos[idx] = { 
        x: Math.round(x), // עיגול למספר שלם
        y: Math.round(y)  // עיגול למספר שלם
      };
      return newPos;
    });
  };

  const handleTableMouseUp = () => {
    console.log('Finished dragging table in hall:', activeHallTab);
    dragInfo.current.idx = null;
    setDraggedElementType(null);
    setDraggedElementId(null);
    document.removeEventListener("mousemove", handleTableMouseMove);
    document.removeEventListener("mouseup", handleTableMouseUp);
  };

  // גרירה של אלמנטי אולם
  const handleHallElementMouseDown = (e, elementId) => {
    if (isViewer) return;
    console.log('🎭 Starting drag for hall element:', elementId);
    console.log('🎭 Mouse event:', e);
    console.log('🎭 CurrentTarget element:', e.currentTarget);
    
    const element = hallElements.find(el => el.id === elementId);
    if (!element) return;
    
    // שמירה של נקודת ההתחלה במונחי המסך + המיקום ההתחלתי של האלמנט
    dragInfo.current = {
      mouseStartX: e.clientX,
      mouseStartY: e.clientY,
      startX: element.x || 0,
      startY: element.y || 0,
      lastDraggedId: elementId,
    };
    
    // שמור את ה-ID ב-ref
    draggedElementIdRef.current = elementId;
    
    console.log('🎭 Drag info set (delta-based):', dragInfo.current);
    console.log('🎭 Dragged element ID ref set:', draggedElementIdRef.current);
    
    setDraggedElementType('hall_element');
    setDraggedElementId(elementId);
    document.addEventListener("mousemove", handleHallElementMouseMove);
    document.addEventListener("mouseup", handleHallElementMouseUp);
    
    console.log('🎭 Event listeners added, drag started!');
  };

  const handleHallElementMouseMove = e => {
    const currentDraggedId = draggedElementIdRef.current; // השתמש ב-ref
    const { mouseStartX, mouseStartY, startX, startY } = dragInfo.current || {};
    
    if (!currentDraggedId || mouseStartX == null) {
      console.log('🎭 No dragged element ID in ref, skipping move');
      return;
    }
    
    // התאמה ל-zoom: תזוזת העכבר על המסך לתזוזה במרחב המפה
    const dx = (e.clientX - mouseStartX) / (zoom || 1);
    const dy = (e.clientY - mouseStartY) / (zoom || 1);
    const x = startX + dx;
    const y = startY + dy;
    
    setHallElements(prev => {
      const updated = prev.map(el => 
        el.id === currentDraggedId 
        ? { ...el, x, y }
        : el
      );
      return updated;
    });
  };

  const handleHallElementMouseUp = () => {
    console.log('🎭 Finished dragging hall element');
    console.log('🎭 Current draggedElementId from ref:', draggedElementIdRef.current);
    
    // שמור את המיקום החדש לשרת לפני איפוס
    const currentDraggedId = draggedElementIdRef.current;
    if (currentDraggedId) {
      const element = hallElements.find(el => el.id === currentDraggedId);
      if (element) {
        const nudged = nudgeHallElementOffTables(element);
        if (nudged.x !== element.x || nudged.y !== element.y) {
          setHallElements(prev => prev.map(el => el.id === element.id ? { ...el, x: nudged.x, y: nudged.y } : el));
        }
        console.log('🎭 Saving position for element:', element.id, 'at:', nudged.x, nudged.y);
        handleUpdateHallElementPosition(element.id, nudged.x, nudged.y);
      }
    }
    
    // נקה את האירועים
    document.removeEventListener("mousemove", handleHallElementMouseMove);
    document.removeEventListener("mouseup", handleHallElementMouseUp);
    
    // איפוס המצב
    setDraggedElementType(null);
    setDraggedElementId(null);
    draggedElementIdRef.current = null; // נקה את ה-ref
    
    // נקה את המידע
    dragInfo.current = {};
    console.log('🎭 Drag cleanup completed');
  };

  // פונקציה לעדכון מיקום אלמנט אולם בשרת
  const handleUpdateHallElementPosition = async (elementId, x, y) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8001/tables/hall-elements/${elementId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ x, y }),
      });

      if (!response.ok) {
        console.error('Failed to update hall element position');
      } else {
        console.log('🎭 Hall element position updated successfully');
      }
    } catch (error) {
      console.error('Error updating hall element position:', error);
    }
  };

  // פונקציות לעדכון בשרת - עכשיו לא נצטרך אותן כי יש שמירה אוטומטית
  const handleUpdateHallElementSize = async (elementId, width, height) => {
    // לא נצטרך את זה יותר כי יש שמירה אוטומטית
    console.log('🎭 Size update handled by automatic save');
  };

  const handleUpdateHallElementRotation = async (elementId, rotation) => {
    // לא נצטרך את זה יותר כי יש שמירה אוטומטית
    console.log('🎭 Rotation update handled by automatic save');
  };

  // מחיקת אלמנט אולם
  const handleRemoveHallElement = async (elementId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8001/tables/hall-elements/${elementId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        setHallElements(prev => prev.filter(el => el.id !== elementId));
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error removing hall element:', error);
      alert(`שגיאה במחיקת אלמנט: ${error.message}`);
    }
  };

  // הוספת אלמנט אולם חדש
  const handleAddHallElement = async () => {
    if (!newHallElement.name || !newHallElement.element_type) return;
    
    try {
      const token = localStorage.getItem('access_token');
      
      // מיקום ראשוני טוב יותר לפי סוג האלמנט
      let initialX, initialY, initialWidth, initialHeight;
      
      if (newHallElement.element_type === 'stage') {
        // במה - מלבן גדול וצר באמצע העליון
        initialX = 50;
        initialY = 20;
        initialWidth = 1200;
        initialHeight = 200;
      } else {
        // כניסה - מלבן ממש צר וקטן
        initialX = 50;
        initialY = 50;
        initialWidth = 40;
        initialHeight = 100;
      }
      
      const elementData = {
        event_id: Number(eventId),
        name: newHallElement.name,
        element_type: newHallElement.element_type,
        width: newHallElement.width ? Number(newHallElement.width) : initialWidth,
        height: newHallElement.height ? Number(newHallElement.height) : initialHeight,
        x: initialX,
        y: initialY,
        hall_type: activeHallTab,
        properties: null
      };

      console.log('🎭 Adding hall element with data:', elementData);
      console.log('🎭 Initial dimensions for stage:', initialWidth, 'x', initialHeight);
      console.log('🎭 Element type:', newHallElement.element_type, 'Initial size:', initialWidth, 'x', initialHeight);
      const response = await fetch(`http://localhost:8001/tables/hall-elements/event/${eventId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(elementData),
      });

      if (response.ok) {
        const newElement = await response.json();
        console.log('🎭 New hall element created successfully:', newElement);
        console.log('🎭 Saved dimensions in server:', newElement.width, 'x', newElement.height);
        setHallElements(prev => [...prev, newElement]);
        setNewHallElement({ name: "", element_type: "stage", width: "", height: "" });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error adding hall element:', error);
      alert(`שגיאה בהוספת אלמנט: ${error.message}`);
    }
  };

  // פונקציה לעדכון גודל הבמה
  const handleUpdateStageSize = async (elementId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8001/tables/hall-elements/${elementId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          width: 1200, 
          height: 200 
        }),
      });

      if (response.ok) {
        console.log('🎭 Stage size updated successfully to 1200x200');
        // רענן את הרשימה
        const updatedElements = hallElements.map(el => 
          el.id === elementId 
            ? { ...el, width: 1200, height: 200 }
            : el
        );
        setHallElements(updatedElements);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating stage size:', error);
      alert(`שגיאה בעדכון גודל הבמה: ${error.message}`);
    }
  };

  // פונקציות לשינוי גודל וסיבוב
  const handleResizeStart = (e, elementId) => {
    if (isViewer) return;
    e.stopPropagation();
    const element = hallElements.find(el => el.id === elementId);
    if (element) {
      setResizingElement(elementId);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: element.width || 120,
        height: element.height || 80,
        zoomAtStart: zoom
      });
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
    }
  };

  const handleResizeMove = (e) => {
    if (!resizingElement) return;
    // התאמה לזום: ההזזה במסך מחולקת ב-zoom כדי לקבל שינוי בגודל במרחב המפה
    const deltaX = (e.clientX - resizeStart.x) / (resizeStart.zoomAtStart || 1);
    const deltaY = (e.clientY - resizeStart.y) / (resizeStart.zoomAtStart || 1);
    
    const element = hallElements.find(el => el.id === resizingElement);
    const isEntrance = element?.element_type === 'entrance';
    
    // כניסה יכולה להיות צרה יותר (מינימום 5 פיקסלים)
    const minWidth = isEntrance ? 5 : 50;
    const minHeight = isEntrance ? 15 : 50;
    
    let newWidth = Math.max(minWidth, resizeStart.width + deltaX);
    let newHeight = Math.max(minHeight, resizeStart.height + deltaY);
    
    // Snap עדין ומדויק כמו בוורד: החזק Shift כדי לקפוץ בקפיצות של 5px
    if (e.shiftKey) {
      const snap = 5;
      newWidth = Math.round(newWidth / snap) * snap;
      newHeight = Math.round(newHeight / snap) * snap;
    }
    
    setHallElements(prev => prev.map(el => 
      el.id === resizingElement 
        ? { ...el, width: newWidth, height: newHeight }
        : el
    ));
  };

  const handleResizeEnd = () => {
    if (resizingElement) {
      setResizingElement(null);
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
    }
  };

  const handleRotateStart = (e, elementId) => {
    if (isViewer) return;
    e.stopPropagation();
    const element = hallElements.find(el => el.id === elementId);
    if (element) {
      const rect = e.target.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
      
      setRotatingElement(elementId);
      setRotateStart({
        x: e.clientX,
        y: e.clientY,
        angle: angle
      });
      document.addEventListener("mousemove", handleRotateMove);
      document.addEventListener("mouseup", handleRotateEnd);
    }
  };

  const handleRotateMove = (e) => {
    if (!rotatingElement) return;
    const element = hallElements.find(el => el.id === rotatingElement);
    if (element) {
      const rect = e.target.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const newAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
      
      setHallElements(prev => prev.map(el => 
        el.id === rotatingElement 
          ? { ...el, rotation: newAngle }
          : el
      ));
    }
  };

  const handleRotateEnd = () => {
    if (rotatingElement) {
      setRotatingElement(null);
      document.removeEventListener("mousemove", handleRotateMove);
      document.removeEventListener("mouseup", handleRotateEnd);
    }
  };

  // כשמחליפים אולם, נאפס את המצב וטען מחדש את השולחנות
  useEffect(() => {
    console.log('Hall type changed to:', activeHallTab);
    
    // שמור את המצב הנוכחי לפני החלפה
    if (tablePositions.length > 0) {
      const localStorageKey = `tablePositions_${eventId}_${activeHallTab === 'm' ? 'w' : 'm'}`;
      localStorage.setItem(localStorageKey, JSON.stringify(tablePositions));
    }
    
    if (hallElements.length > 0) {
      const localStorageKey = `hallElementPositions_${eventId}_${activeHallTab === 'm' ? 'w' : 'm'}`;
      const positionsToSave = hallElements.map(el => ({
        id: el.id,
        x: Math.round(el.x || 0),
        y: Math.round(el.y || 0),
        width: Math.round(el.width || 0),
        height: Math.round(el.height || 0),
        rotation: el.rotation || 0
      }));
      localStorage.setItem(localStorageKey, JSON.stringify(positionsToSave));
    }
    
    // אפס את המצב הנוכחי
    setTableTypes([]);
    setTablePositions([]);
    setNewTable({ size: "", count: "", shape: "circular" });
    setShowMap(false);
    
    // טען מחדש את השולחנות לאולם החדש
    const loadTablesForNewHall = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8001/tables/event/${eventId}?hall_type=${activeHallTab}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          console.log('Fetched tables for new hall:', data);
          console.log('Number of tables for new hall:', data.length);
          console.log('New hall type:', activeHallTab);
          setTables(Array.isArray(data) ? data : []);
          setTableCategories((Array.isArray(data) ? data : []).map(t => t.category || ''));
          
          // קיבוץ לפי size ו-shape
          const typeMap = {};
          data.forEach(t => {
            console.log('Processing table for typeMap:', {
              id: t.id,
              size: t.size,
              sizeType: typeof t.size,
              shape: t.shape,
              shapeType: typeof t.shape
            });
            
            // Handle null/undefined size by using a default value instead of skipping
            let tableSize = t.size;
            if (tableSize === null || tableSize === undefined || isNaN(Number(tableSize))) {
              console.warn('Table has invalid size, using default size 4:', t);
              tableSize = 4; // Use default size instead of skipping
            }
            const key = `${tableSize}_${t.shape || 'circular'}`;
            if (!typeMap[key]) typeMap[key] = { size: Number(tableSize), count: 0, shape: t.shape || 'circular' };
            typeMap[key].count++;
            console.log('Added to typeMap:', key, typeMap[key]);
          });
          const types = Object.values(typeMap);
          console.log('Grouped table types for new hall:', types);
          setTableTypes(types);
          
          // טען מיקומים מהשרת או מ-localStorage
          const serverPositions = data.map(t => ({ x: t.x, y: t.y }));
          const localStorageKey = `tablePositions_${eventId}_${activeHallTab}`;
          const savedPositions = localStorage.getItem(localStorageKey);
          
          let positionsToUse = serverPositions;
          
          if (savedPositions && serverPositions.length > 0) {
            try {
              const parsedPositions = JSON.parse(savedPositions);
              if (parsedPositions.length === serverPositions.length) {
                console.log('Using saved positions from localStorage for new hall');
                positionsToUse = parsedPositions;
              }
            } catch (error) {
              console.error('Error parsing saved positions for new hall:', error);
            }
          }
          
          setTablePositions(positionsToUse);
        }
      } catch (error) {
        console.error('Error loading tables for new hall:', error);
      }
    };
    
    loadTablesForNewHall();
  }, [activeHallTab, eventId]);

  // משתנה עזר גלובלי: כל השולחנות (לפי סוגים וכמות)
  const allTables = tableTypes.flatMap(t => Array(Number(t.count)).fill({ size: Number(t.size), shape: t.shape }));
  const tablesForRender = tables.length > 0 ? tables.map(t => ({ size: Number(t.size), shape: t.shape })) : allTables;
  
  // בדיקה נוספת
  console.log('=== DEBUG INFO ===');
  console.log('tableTypes:', tableTypes);
  console.log('allTables:', allTables);
  console.log('tablePositions:', tablePositions);
  
  // פונקציה לשיבוץ אוטומטי של שולחנות ברשת ללא חפיפה
  const computeAutoLayout = (count, options = {}) => {
    const {
      margin = 40,
      cell = 140,
      columns = 10,
    } = options;
    const positions = [];
    for (let i = 0; i < count; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = margin + col * cell;
      const y = margin + row * cell;
      positions.push({ x, y });
    }
    return positions;
  };

  // זיהוי חפיפה לפי סף מרחק (כדי לזהות גם כמעט-אותו-מיקום)
  const hasOverlapWithin = (positions, threshold = 100) => {
    if (!Array.isArray(positions)) return false;
    for (let i = 0; i < positions.length; i++) {
      const a = positions[i];
      if (!a || typeof a.x !== 'number' || typeof a.y !== 'number') return true;
      for (let j = i + 1; j < positions.length; j++) {
        const b = positions[j];
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number') return true;
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        if (dx < threshold && dy < threshold) return true;
      }
    }
    return false;
  };

  // חישוב שיבוץ אוטומטי עבור אלמנטי אולם (במה/כניסה)
  const computeHallElementsAutoLayout = (elements, options = {}) => {
    const margin = 40;
    const gap = 40;
    const defaultStage = { width: 1200, height: 200 };
    const defaultEntrance = { width: 40, height: 100 };

    const mapWidth = (mapRef.current?.clientWidth || 1400);
    const mapHeight = (mapRef.current?.clientHeight || 800);

    const placed = [];
    const isFree = (rect) => {
      // מול אלמנטים שכבר הונחו
      const collidePlaced = placed.some(p => !(rect.right <= p.left || rect.left >= p.right || rect.bottom <= p.top || rect.top >= p.bottom));
      if (collidePlaced) return false;
      // מול שולחנות
      const collideTables = tablePositions.some(pos => {
        const t = { left: pos.x, top: pos.y, right: pos.x + 120, bottom: pos.y + 120 };
        return !(rect.right <= t.left || rect.left >= t.right || rect.bottom <= t.top || rect.top >= t.bottom);
      });
      return !collideTables;
    };

    const tryPlace = (w, h, startX, startY) => {
      const step = 40; // צעדי חיפוש
      for (let y = startY; y + h + margin < mapHeight; y += step) {
        for (let x = startX; x + w + margin < mapWidth; x += step) {
          const rect = { left: x, top: y, right: x + w, bottom: y + h };
          if (isFree(rect)) return rect;
        }
      }
      // fallback: החזר למרווח ההתחלתי
      return { left: margin, top: margin, right: margin + w, bottom: margin + h };
    };

    const result = elements.map(raw => {
      const el = { ...raw };
      const w = Number(el.width) || (el.element_type === 'stage' ? defaultStage.width : defaultEntrance.width);
      const h = Number(el.height) || (el.element_type === 'stage' ? defaultStage.height : defaultEntrance.height);
      const startX = el.element_type === 'stage' ? margin : Math.min(margin, mapWidth - w - margin);
      const startY = el.element_type === 'stage' ? margin : Math.max(margin * 2 + defaultStage.height, margin);
      const placedRect = tryPlace(w, h, startX, startY);
      el.x = placedRect.left;
      el.y = placedRect.top;
      placed.push(placedRect);
      return el;
    });

    return result;
  };

  // בדיקת חפיפה מדויקת לאלמנטי אולם לפי מלבנים
  const hasHallElementsOverlap = (elements) => {
    const getRect = (el) => ({
      left: Number(el.x) || 0,
      top: Number(el.y) || 0,
      right: (Number(el.x) || 0) + (Number(el.width) || (el.element_type === 'stage' ? 1200 : 40)),
      bottom: (Number(el.y) || 0) + (Number(el.height) || (el.element_type === 'stage' ? 200 : 100))
    });
    for (let i = 0; i < elements.length; i++) {
      const a = elements[i];
      if (typeof a.x !== 'number' || typeof a.y !== 'number') return true;
      const ra = getRect(a);
      for (let j = i + 1; j < elements.length; j++) {
        const b = elements[j];
        if (typeof b.x !== 'number' || typeof b.y !== 'number') return true;
        const rb = getRect(b);
        const overlap = !(ra.right <= rb.left || ra.left >= rb.right || ra.bottom <= rb.top || ra.top >= rb.bottom);
        if (overlap) return true;
      }
    }
    return false;
  };

  // מניעת חפיפה: אם אלמנט אולם נופל על שולחן – הזז לשמאל לפני שמירה
  const nudgeHallElementOffTables = (element) => {
    const el = { ...element };
    const elWidth = Number(el.width) || (el.element_type === 'stage' ? 1200 : 40);
    const elHeight = Number(el.height) || (el.element_type === 'stage' ? 200 : 100);
    const elRect = { left: el.x, top: el.y, right: el.x + elWidth, bottom: el.y + elHeight };
    const tablesOverlap = tablePositions.some((pos) => {
      if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return false;
      const tRect = { left: pos.x, top: pos.y, right: pos.x + 120, bottom: pos.y + 120 };
      const isOverlap = !(elRect.right <= tRect.left || elRect.left >= tRect.right || elRect.bottom <= tRect.top || elRect.top >= tRect.bottom);
      return isOverlap;
    });
    if (tablesOverlap) {
      el.x = 40; // דחיפה לעמודה השמאלית הבטוחה
    }
    return el;
  };

  // טען קטגוריות קיימות מראשי שולחן לפי אולם (מגדר)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const r = await fetch(`http://localhost:8001/tables/table-heads/event/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!r.ok) { setAvailableCategories([]); return; }
        const list = await r.json();
        const gender = activeHallTab === 'm' ? 'male' : 'female';
        const cats = Array.from(new Set((list || []).filter(th => (th.gender || '').toLowerCase() === gender).map(th => (th.category || '').trim()).filter(Boolean)));
        setAvailableCategories(cats);
      } catch (e) {
        setAvailableCategories([]);
      }
    };
    loadCategories();
  }, [eventId, activeHallTab]);

  return (
    <div style={{ background: '#f8fafc', borderRadius: 16, boxShadow: '0 2px 12px #0001', padding: 32, margin: '30px auto', maxWidth: 800 }}>
      {/* טאבים לבחירת אולם */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => setActiveHallTab('m')}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            background: activeHallTab === 'm' ? '#4f8cff' : '#e2e8f0',
            color: activeHallTab === 'm' ? 'white' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            flex: 1
          }}
        >
          אולם גברים
        </button>
        <button
          onClick={() => setActiveHallTab('w')}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            background: activeHallTab === 'w' ? '#4f8cff' : '#e2e8f0',
            color: activeHallTab === 'w' ? 'white' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            flex: 1
          }}
        >
          אולם נשים
        </button>
      </div>

      <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 24 }}>
        הגדרות {activeHallTab === 'm' ? 'אולם גברים' : 'אולם נשים'}
      </h2>

      {/* טופס הוספת אלמנט אולם */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px 0', fontWeight: 600, fontSize: 18 }}>הוספת אלמנטי אולם:</h3>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <select
            value={newHallElement.element_type}
            onChange={e => setNewHallElement({ ...newHallElement, element_type: e.target.value })}
            style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', width: 150, fontSize: 16 }}
          >
            <option value="stage">במה</option>
            <option value="entrance">כניסה</option>
          </select>
          <input
            type="text"
            placeholder="שם האלמנט"
            value={newHallElement.name}
            onChange={e => setNewHallElement({ ...newHallElement, name: e.target.value })}
            style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', width: 200, fontSize: 16 }}
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="רוחב (px)"
            value={newHallElement.width}
            onChange={e => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                // הצג עשרוני רק אם המספר לא שלם
                const formattedValue = Number.isInteger(value) ? value.toString() : value.toFixed(2);
                setNewHallElement({ ...newHallElement, width: formattedValue });
              } else if (e.target.value === '') {
                setNewHallElement({ ...newHallElement, width: '' });
              }
            }}
            style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', width: 120, fontSize: 16 }}
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="גובה (px)"
            value={newHallElement.height}
            onChange={e => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                // הצג עשרוני רק אם המספר לא שלם
                const formattedValue = Number.isInteger(value) ? value.toString() : value.toFixed(2);
                setNewHallElement({ ...newHallElement, height: formattedValue });
              } else if (e.target.value === '') {
                setNewHallElement({ ...newHallElement, height: '' });
              }
            }}
            style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', width: 120, fontSize: 16 }}
          />
          <button
            onClick={handleAddHallElement}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer'
            }}
            disabled={isViewer}
          >
            + הוסף אלמנט
          </button>
        </div>

        {/* רשימת אלמנטי אולם */}
        {hallElements.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 12px 0', fontWeight: 600, fontSize: 16 }}>אלמנטי אולם קיימים:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hallElements.map((element) => (
                <div key={element.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: '#fff',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0'
                }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: 4, 
                    fontSize: 12, 
                    fontWeight: 600,
                    background: element.element_type === 'stage' ? '#fbbf24' : '#34d399',
                    color: 'white'
                  }}>
                    {element.element_type === 'stage' ? 'במה' : 'כניסה'}
                  </span>
                  <span style={{ flex: 1, fontSize: 16 }}>{element.name}</span>
                  {element.width && element.height && (
                    <span style={{ color: '#64748b', fontSize: 14 }}>
                      {(() => {
                        const width = parseFloat(element.width);
                        const height = parseFloat(element.height);
                        const formattedWidth = Number.isInteger(width) ? width.toString() : width.toFixed(2);
                        const formattedHeight = Number.isInteger(height) ? height.toString() : height.toFixed(2);
                        return `${formattedWidth}×${formattedHeight} px`;
                      })()}
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveHallElement(element.id)}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 16px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    disabled={isViewer}
                  >
                    מחק
                  </button>
                  {false && element.element_type === 'stage' && (
                    <button
                      onClick={() => handleUpdateStageSize(element.id)}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 16px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      disabled={isViewer}
                    >
                      עדכן גודל
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* טופס הוספת סוג שולחן */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          type="number"
          min={1}
          placeholder="גודל שולחן (כמות כסאות)"
          value={newTable.size}
          onChange={e => setNewTable({ ...newTable, size: e.target.value })}
          style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', width: 200, fontSize: 16 }}
        />
        <select
          value={newTable.shape}
          onChange={e => setNewTable({ ...newTable, shape: e.target.value })}
          style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', width: 150, fontSize: 16 }}
        >
          <option value="circular">עגול</option>
          <option value="rectangular">מרובע</option>
          <option value="oblong">מלבן (ארוך)</option>
        </select>
        <input
          type="number"
          min={1}
          placeholder="כמות שולחנות"
          value={newTable.count}
          onChange={e => setNewTable({ ...newTable, count: e.target.value })}
          style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', width: 160, fontSize: 16 }}
        />
        <button
          onClick={handleAddTableType}
          style={{
            background: '#4f8cff',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '12px 24px',
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer'
          }}
          disabled={isViewer}
        >
          + הוסף סוג שולחן
        </button>
      </div>

      {/* רשימת סוגי שולחנות */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px 0', fontWeight: 600, fontSize: 18 }}>סוגי שולחנות:</h3>
        {tableTypes.length === 0 && (
          <div style={{ color: '#64748b', background: '#f1f5f9', padding: 16, borderRadius: 8, textAlign: 'center' }}>
            לא הוגדרו סוגי שולחנות
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tableTypes.map((t, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: '#fff',
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid #e2e8f0'
            }}>
              <span style={{ 
                padding: '4px 8px', 
                borderRadius: 4, 
                fontSize: 12, 
                fontWeight: 600,
                background: t.shape === 'circular' ? '#4f8cff' : (t.shape === 'rectangular' ? '#8b5cf6' : '#10b981'),
                color: 'white'
              }}>
                {t.shape === 'circular' ? 'עגול' : (t.shape === 'rectangular' ? 'מרובע' : 'מלבן (ארוך)')}
              </span>
              <span style={{ flex: 1, fontSize: 16 }}>שולחן ל-{t.size} סועדים × {t.count} שולחנות</span>
              <button
                onClick={() => handleRemove(idx)}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                disabled={isViewer}
              >
                מחק
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* כפתור להצגת מפת האולם */}
      <button
        onClick={() => setShowMap(true)}
        style={{
          background: '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '12px 24px',
          fontWeight: 600,
          fontSize: 16,
          cursor: 'pointer',
          marginBottom: 24
        }}
      >
        הצג מפת האולם
      </button>

      {/* מפת האולם */}
      {showMap && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '95vw', height: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <button onClick={handleZoomOut} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer' }}>-</button>
                <span style={{ minWidth: 60, textAlign: 'center', fontWeight: 600 }}>{Math.round(zoom * 100)}%</span>
                <button onClick={handleZoomIn} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer' }}>+</button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontWeight: 600, fontSize: 24 }}>מפת האולם - מבט מלמעלה</h3>
              <button
                onClick={() => setShowMap(false)}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 16
                }}
              >
                סגור
              </button>
            </div>
            
            {/* Hall Map */}
            <div className="hall-map-container">
              <div 
                className="hall-map"
                ref={mapRef}
                style={{
                  width: '100%',
                  height: '80vh',
                  border: '2px solid #ccc',
                  position: 'relative',
                  backgroundColor: '#f9f9f9',
                  overflow: 'hidden'
                }}
                onWheel={handleWheelZoom}
                onMouseDown={handleMapMouseDown}
              >
                {/* תוכן המפה (מוחל עליו ה-transform) */}
                <div
                  className="hall-map-content"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0'
                }}
              >
                {/* רקע המפה - רשת עזר */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `
                    linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
                  `,
                  backgroundSize: '50px 50px',
                  pointerEvents: 'none'
                }} />
                
                {/* הצג אלמנטי אולם */}
                  {hallElements.map((element) => {
                  console.log('🎭 Rendering hall element:', element.element_type, 'Size:', element.width, 'x', element.height, 'Position:', element.x, element.y);
                  console.log('🎭 Applied CSS width/height:', element.width || (element.element_type === 'stage' ? 1200 : 40), 'x', element.height || (element.element_type === 'stage' ? 200 : 100));
                  return (
                  <div
                    key={element.id}
                    onMouseDown={e => handleHallElementMouseDown(e, element.id)}
                      onMouseEnter={() => setHoveredHallElementId(element.id)}
                      onMouseLeave={(e) => {
                        const rt = e.relatedTarget;
                        const isHandle = rt && rt.dataset && (rt.dataset.rotateHandleFor === String(element.id) || rt.dataset.resizeHandleFor === String(element.id));
                        if (isHandle) return; // אל תסתיר אם עוברים לידית
                        hoverTimeoutRef.current = setTimeout(() => {
                          setHoveredHallElementId(prev => (prev === element.id ? null : prev));
                        }, 150);
                      }}
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
                      cursor: isViewer ? 'default' : 'move',
                      userSelect: 'none',
                        border: draggedElementType === 'hall_element' && draggedElementId === element.id ? '4px solid #ef4444' : (element.element_type === 'stage' ? '5px solid #000' : '3px solid rgba(0,0,0,0.2)'),
                        zIndex: 10,
                        transform: element.rotation ? `rotate(${element.rotation}deg)` : 'none',
                        // הוספת אפקטים מיוחדים לבמה
                        ...(element.element_type === 'stage' && {
                          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                          border: '3px solid #d97706',
                          boxShadow: '0 8px 24px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                        })
                      }}
                      onLoad={() => {
                        if (element.element_type === 'stage') {
                          console.log('🎭 Stage element loaded with dimensions:', element.width, 'x', element.height);
                          console.log('🎭 Applied CSS width/height:', element.width || 1200, 'x', element.height || 200);
                        }
                    }}
                  >
                    <div>
                        <div style={{ 
                          fontSize: element.element_type === 'stage' ? '24px' : '14px', 
                          marginBottom: element.element_type === 'stage' ? '12px' : '4px',
                          fontWeight: 'bold',
                          textTransform: element.element_type === 'stage' ? 'uppercase' : 'none',
                          letterSpacing: element.element_type === 'stage' ? '2px' : 'normal'
                        }}>
                          {element.name || (element.element_type === 'stage' ? 'במה' : '')}
                      </div>
                      </div>
                      
                      {/* Resize handles */}
                      {!isViewer && (hoveredHallElementId === element.id || resizingElement === element.id || (draggedElementType === 'hall_element' && draggedElementId === element.id)) && (
                        <>
                          {/* Bottom-right resize handle */}
                          <div
                            onMouseDown={e => handleResizeStart(e, element.id)}
                            onMouseEnter={() => setHoveredHallElementId(element.id)}
                            onMouseLeave={(e) => {
                              const rt = e.relatedTarget;
                              const isParent = rt && (rt === e.currentTarget.parentElement);
                              if (isParent) return; // מעבר חזרה לאלמנט הראשי - אל תסתיר
                              hoverTimeoutRef.current = setTimeout(() => {
                                setHoveredHallElementId(prev => (prev === element.id ? null : prev));
                              }, 150);
                            }}
                    style={{
                      position: 'absolute',
                              bottom: '-8px',
                              right: '-8px',
                              width: '16px',
                              height: '16px',
                              background: '#3b82f6',
                              border: '2px solid white',
                              borderRadius: '50%',
                              cursor: 'nw-resize',
                              zIndex: 20
                            }}
                            data-resize-handle-for={element.id}
                          />
                          {/* Bottom-left resize handle */}
                          <div
                            onMouseDown={e => handleResizeStart(e, element.id)}
                            onMouseEnter={() => setHoveredHallElementId(element.id)}
                            onMouseLeave={() => setHoveredHallElementId(prev => (prev === element.id ? null : prev))}
                            style={{
                              position: 'absolute',
                              bottom: '-8px',
                              left: '-8px',
                              width: '16px',
                              height: '16px',
                              background: '#3b82f6',
                              border: '2px solid white',
                              borderRadius: '50%',
                              cursor: 'ne-resize',
                              zIndex: 20
                            }}
                            data-resize-handle-for={element.id}
                          />
                          {/* Top-right resize handle */}
                          <div
                            onMouseDown={e => handleResizeStart(e, element.id)}
                            onMouseEnter={() => setHoveredHallElementId(element.id)}
                            onMouseLeave={() => setHoveredHallElementId(prev => (prev === element.id ? null : prev))}
                            style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '-8px',
                              width: '16px',
                              height: '16px',
                              background: '#3b82f6',
                              border: '2px solid white',
                              borderRadius: '50%',
                              cursor: 'se-resize',
                              zIndex: 20
                            }}
                            data-resize-handle-for={element.id}
                          />
                          {/* Top-left resize handle */}
                          <div
                            onMouseDown={e => handleResizeStart(e, element.id)}
                            onMouseEnter={() => setHoveredHallElementId(element.id)}
                            onMouseLeave={() => setHoveredHallElementId(prev => (prev === element.id ? null : prev))}
                            style={{
                              position: 'absolute',
                              top: '-8px',
                              left: '-8px',
                              width: '16px',
                              height: '16px',
                              background: '#3b82f6',
                              border: '2px solid white',
                              borderRadius: '50%',
                              cursor: 'sw-resize',
                              zIndex: 20
                            }}
                            data-resize-handle-for={element.id}
                          />
                        </>
                      )}
                      
                      {/* Rotate handle */}
                      {!isViewer && (hoveredHallElementId === element.id || rotatingElement === element.id) && (
                        <div
                          onMouseDown={e => handleRotateStart(e, element.id)}
                          onMouseEnter={() => {
                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                            setHoveredHallElementId(element.id);
                          }}
                          onMouseLeave={(e) => {
                            const rt = e.relatedTarget;
                            const isParent = rt && (rt === e.currentTarget.parentElement);
                            if (isParent) return;
                            hoverTimeoutRef.current = setTimeout(() => {
                              setHoveredHallElementId(prev => (prev === element.id ? null : prev));
                            }, 150);
                          }}
                          style={{
                            position: 'absolute',
                            top: '-12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '28px',
                            height: '28px',
                            background: '#10b981',
                            border: '2px solid white',
                            borderRadius: '50%',
                            cursor: 'grab',
                            zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                            fontSize: '16px',
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                          data-rotate-handle-for={element.id}
                        >
                          ↻
                    </div>
                      )}
                    </div>
                  );
                  })}
                  
                  {/* הצג שולחנות */}
                  {tablesForRender.map((table, idx) => {
                  console.log('Rendering table:', table, 'at index:', idx);
                  const left = tablePositions[idx]?.x ?? 40 + (idx % 8) * 140;
                  const top = tablePositions[idx]?.y ?? 40 + Math.floor(idx / 8) * 140;
                  const categoryValue = tableCategories[idx] || '';
                  return (
                    <div
                      key={idx}
                      onMouseDown={e => handleTableMouseDown(e, idx)}
                      onMouseEnter={() => setHoveredTableIdx(idx)}
                      onMouseLeave={() => setHoveredTableIdx(prev => (prev === idx ? null : prev))}
                      style={{ position: 'absolute', left, top }}
                    >
                      <TableVisual
                        table={table}
                        isDragging={draggedElementType === 'table' && draggedElementId === idx}
                        isViewer={isViewer}
                        onMouseDown={() => {}}
                        style={{ position: 'relative', zIndex: 1 }}
                        label={(categoryValue || '').toString()}
                        tableNumber={table.table_number || idx + 1}
                        guests={table.guests || []}
                      />
                      {false && (
                        <select
                          value={categoryValue}
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setTableCategories(prev => { const arr = [...prev]; arr[idx] = e.target.value; return arr; })}
                          title="בחר קטגוריה"
                          style={{
                  position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            minWidth: 120,
                            height: 32,
                            opacity: hoveredTableIdx === idx ? 1 : 0,
                            pointerEvents: hoveredTableIdx === idx ? 'auto' : 'none',
                            background: hoveredTableIdx === idx ? 'rgba(255,255,255,0.96)' : 'transparent',
                            border: hoveredTableIdx === idx ? '1px solid #e2e8f0' : 'none',
                            borderRadius: 8,
                            padding: hoveredTableIdx === idx ? '6px 8px' : 0,
                            color: '#0f172a',
                            fontSize: 12,
                            zIndex: 30,
                            cursor: 'pointer',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            appearance: 'none'
                          }}
                        >
                          <option value="">בחר קטגוריה</option>
                          {availableCategories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 