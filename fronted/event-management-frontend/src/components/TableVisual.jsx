import React, { useState } from 'react';
import { useDrag } from 'react-dnd';

const TableVisual = ({ table, guests = [], isDragging, isViewer, onMouseDown, style = {}, label, categoryLabel = '', tableNumber, showGuestsList = false, onToggleGuestsList }) => {
  const { size, shape } = table;
  
  // בדיקה אם הקוד שלנו רץ
  console.log('TableVisual component is running!', { table, size, shape });
  
  // מספר דינמי של כיסאות לפי גודל השולחן (ברירת מחדל 12)
  const FIXED_CHAIR_COUNT = 12;
  const baseChairCount = Math.max(1, Number(size) || FIXED_CHAIR_COUNT);
  const occupiedCount = Math.max(0, Number(table.occupied ?? (Array.isArray(guests) ? guests.length : 0)) || 0);
  
  // חישוב כסאות אדומים לחריגה - הכסאות האדומים מתווספים לשולחן
  const overflowCount = Math.max(0, occupiedCount - baseChairCount);
  const totalChairCount = Math.max(baseChairCount, occupiedCount); // סה"כ כסאות - לפחות כמות הכסאות המקורית, או מספר המוזמנים אם יותר

  const categoryText = (categoryLabel || '').toString().trim();
  const arcId = `table-cat-arc-${table.id || `${shape}-${size}`}`;
 
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
  
  // ערכי ברירת מחדל ל-style
  const defaultStyle = {
    width: 120,
    height: 120
  };

  const safeLabel = typeof label === 'string' || typeof label === 'number' ? String(label) : '';
  const safeTableNumber = typeof tableNumber === 'string' || typeof tableNumber === 'number' ? String(tableNumber) : '';
  const len = safeLabel.length;
  // בסיס קטן יותר כברירת מחדל + התאמה לפי אורך
  const fontSizeCircular = safeLabel ? (len <= 2 ? 13 : len <= 4 ? 11 : 10) : 18;
  const fontSizeRect = safeLabel ? (len <= 2 ? 16 : len <= 4 ? 14 : len <= 6 ? 12 : 11) : 18;
  
  // גבולות רוחב בטוחים לאזור הטקסט במרכז
  const circularMaxWidth = 44; // פיקסלים בתוך העיגול הפנימי
  const rectMaxWidth = 60;     // פיקסלים בתוך הריבוע הפנימי
  const estimateWidth = (text, fs) => (String(text).length || 0) * fs * 0.6;
  const circularNeedsCompress = safeLabel && estimateWidth(safeLabel, fontSizeCircular) > circularMaxWidth;
  const rectNeedsCompress = safeLabel && estimateWidth(safeLabel, fontSizeRect) > rectMaxWidth;

  // קשת קטגוריה: רדיוס גדול יותר + התאמת גודל טקסט לפי אורך
  const arcRadius = 30; // היה 22
  const arcHalfLength = Math.PI * arcRadius; // חצי היקף
  let arcFontSize = 12;
  if (categoryText) {
    while (estimateWidth(categoryText, arcFontSize) > arcHalfLength - 6 && arcFontSize > 8) {
      arcFontSize -= 1;
    }
  }

  // הפונקציות הגיאומטריות (עגול)
  const chairPosCircular = (i) => {
    const angle = (i * 360 / totalChairCount) * (Math.PI / 180);
    const x = 60 + Math.cos(angle) * 55;
    const y = 60 + Math.sin(angle) * 55;
    const rotation = (angle * 180 / Math.PI) + 90;
    return { x, y, rotation };
  };

  // מיקומי כסאות לשולחן מרובע: סביב ארבעת הצדדים
  const rectPositions = (() => {
    const positions = [];
    const n = totalChairCount;
    const base = Math.floor(n / 4);
    let rem = n % 4;
    // חלוקה לטופ, ימין, תחתון, שמאל (top,right,bottom,left)
    const sides = [base, base, base, base];
    for (let s = 0; s < 4 && rem > 0; s++, rem--) sides[s] += 1;

    // קואורדינטות שולחן
    const innerLeft = 25, innerTop = 25, innerWidth = 70, innerHeight = 70;
    // קווי כסאות מחוץ לשולחן במעט
    const topY = innerTop - 12;
    const bottomY = innerTop + innerHeight + 12;
    const leftX = innerLeft - 12;
    const rightX = innerLeft + innerWidth + 12;

    // פרמטרים לגודל/רווחים
    const SIDE_PADDING = 6;  // ריווח מהקצוות של הצלע
    const SEAT_GAP = 2;      // רווח בין כסאות (קטן אך נראה)
    const DEFAULT_SEAT_W = 16; // רוחב כסא ברירת מחדל
    const SEAT_W_MIN = 8;      // רוחב מינימלי כשצפוף
    const SEAT_H = 12;         // גובה כסא קבוע

    // עזר לפיזור לאורך קטע באחידות (עם ריווח מהקצוות)
    const distribute = (count, start, length) => {
      const res = [];
      const usable = Math.max(0, length - 2 * SIDE_PADDING);
      for (let i = 0; i < count; i++) {
        const ratio = (i + 1) / (count + 1);
        res.push(start + SIDE_PADDING + ratio * usable);
      }
      return { points: res, usable };
    };

    // מחשב רוחב כסא לפי מרווח בין מרכזים
    const seatWidthFrom = (usable, count) => {
      const span = count > 0 ? usable / (count + 1) : usable; // מרחק בין מרכזים סמוכים
      const allowed = span - SEAT_GAP; // רוחב מקסימלי שמבטיח רווח
      // שמור על ברירת מחדל אם יש מקום; אם לא — הקטן רק עד שנוצר רווח קטן
      if (allowed >= DEFAULT_SEAT_W) return DEFAULT_SEAT_W;
      return Math.max(SEAT_W_MIN, allowed);
    };

    // נשתמש ברוחב/גובה החיצוניים (90x90) כדי לאפשר כיסאות גדולים כשיש מקום
    const outerLeft = 15, outerTop = 15, outerWidth = 90, outerHeight = 90;

    // Top
    const top = distribute(sides[0], outerLeft, outerWidth);
    const topSeatW = seatWidthFrom(top.usable, sides[0]);
    top.points.forEach(x => positions.push({ x, y: topY, rotation: 0, seatW: topSeatW, seatH: SEAT_H }));

    // Right
    const right = distribute(sides[1], outerTop, outerHeight);
    const rightSeatW = seatWidthFrom(right.usable, sides[1]);
    right.points.forEach(y => positions.push({ x: rightX, y, rotation: 90, seatW: rightSeatW, seatH: SEAT_H }));

    // Bottom
    const bottom = distribute(sides[2], outerLeft, outerWidth);
    const bottomSeatW = seatWidthFrom(bottom.usable, sides[2]);
    bottom.points.forEach(x => positions.push({ x, y: bottomY, rotation: 180, seatW: bottomSeatW, seatH: SEAT_H }));

    // Left
    const left = distribute(sides[3], outerTop, outerHeight);
    const leftSeatW = seatWidthFrom(left.usable, sides[3]);
    left.points.forEach(y => positions.push({ x: leftX, y, rotation: -90, seatW: leftSeatW, seatH: SEAT_H }));

    return positions;
  })();

  const getChairPos = (i) => (shape === 'rectangular' ? rectPositions[i % rectPositions.length] : chairPosCircular(i));

  // ידית גרירה מעל כסא (HTML) כדי לתמוך ב-HTML5 DnD על פני SVG
  const ChairHandle = ({ index }) => {
    const guest = Array.isArray(guests) ? guests[index] : undefined;
    const pos = getChairPos(index);
    const { x, y } = pos;
    const seatW = pos?.seatW || 16;
    const seatH = pos?.seatH || 12;
    const [{ isDragging: isDragGuest }, drag] = useDrag(() => ({
      type: 'GUEST',
      item: guest ? { ...guest } : {},
      canDrag: () => Boolean(guest),
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() })
    }), [guest]);
    const name = guest ? getDisplayName(guest) : '';
    return (
      <div
        ref={drag}
        title={name}
        style={{
          position: 'absolute',
          left: x - seatW / 2,
          top: y - seatH / 2,
          width: seatW,
          height: seatH,
          cursor: guest ? 'grab' : 'default',
          background: 'transparent',
          zIndex: 3,
          pointerEvents: guest ? 'auto' : 'none',
          opacity: isDragGuest ? 0.7 : 1
        }}
      />
    );
  };
  
  // יצירת תמונת שולחן עגול עם כיסאות
  const renderCircularTable = () => {
    console.log('Rendering circular table with size:', size, 'totalChairCount:', totalChairCount, 'occupied:', occupiedCount);
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
        {/* צל עדין */}
        <circle cx="62" cy="62" r="52" fill="rgba(0,0,0,0.08)"/>
        {/* טבעות השולחן */}
        <circle cx="60" cy="60" r="50" fill="#A0522D" stroke="#8B4513" strokeWidth="2"/>
        <circle cx="60" cy="60" r="25" fill="#F4A460" stroke="#A0522D" strokeWidth="2"/>
        <circle cx="60" cy="60" r="20" fill="none" stroke="#D2691E" strokeWidth="1" opacity="0.3"/>
        <circle cx="60" cy="60" r="15" fill="none" stroke="#D2691E" strokeWidth="1" opacity="0.3"/>
        {/* קשת לטקסט קטגוריה */}
        {categoryText && (
          <>
            <defs>
              {/* חצי מעגל עליון ברדיוס סביב המרכז */}
              <path id={arcId} d={`M ${60 - arcRadius} 60 A ${arcRadius} ${arcRadius} 0 0 1 ${60 + arcRadius} 60`} />
            </defs>
            <text fill="#fff" fontSize={arcFontSize} fontWeight="700" style={{ pointerEvents: 'none' }}>
              <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
                {categoryText}
              </textPath>
            </text>
          </>
        )}
        {/* כיסאות מסביב לפי כמות הכיסאות */}
        {Array.from({ length: totalChairCount }, (_, i) => {
          const { x, y, rotation } = chairPosCircular(i);
          const isOccupied = Boolean((Array.isArray(guests) ? guests[i] : undefined)) || i < occupiedCount;
          const isOverflowChair = i >= baseChairCount; // כסא אדום לחריגה
          
          // צבעים שונים לכסאות רגילים ואדומים
          let fill, stroke, backFill;
          if (isOverflowChair) {
            // כסא אדום לחריגה
            fill = isOccupied ? '#ef4444' : '#dc2626';
            stroke = isOccupied ? '#dc2626' : '#991b1b';
            backFill = isOccupied ? '#991b1b' : '#7f1d1d';
          } else {
            // כסא רגיל
            fill = isOccupied ? '#10b981' : '#171717';
            stroke = isOccupied ? '#0e9f6e' : '#333333';
            backFill = isOccupied ? '#0b7f5a' : '#333333';
          }
          
          return (
            <g key={i} transform={`rotate(${rotation} ${x} ${y})`}>
              <rect x={x - 8} y={y - 6} width="16" height="12" fill={fill} rx="3" ry="3" stroke={stroke} strokeWidth="1" />
              <rect x={x - 8} y={y - 6} width="16" height="4" fill={backFill} rx="2" ry="2" />
            </g>
          );
        })}
        {/* מרכז השולחן: מספר שולחן + תווית */}
        {safeTableNumber && (
          <text
            x="60"
            y="55"
            textAnchor="middle"
            fill="white"
            fontSize="18"
            fontWeight="bold"
          >
            {safeTableNumber}
          </text>
        )}
        <text
          x="60"
          y={safeTableNumber ? "75" : "65"}
          textAnchor="middle"
          fill="white"
          fontSize={fontSizeCircular}
          fontWeight="bold"
          {...(circularNeedsCompress ? { lengthAdjust: 'spacingAndGlyphs', textLength: circularMaxWidth } : {})}
        >
          {safeLabel ? safeLabel : ''}
        </text>
      </svg>
    );
  };

  // יצירת תמונת שולחן מרובע עם כיסאות (פריסה סביב צלעות)
  const renderRectangularTable = () => {
    console.log('Rendering rectangular table with size:', size, 'totalChairCount:', totalChairCount, 'occupied:', occupiedCount);
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
        {/* צל */}
        <rect x="17" y="17" width="94" height="94" fill="rgba(0,0,0,0.08)" rx="12"/>
        {/* רקע מרובע */}
        <rect x="15" y="15" width="90" height="90" fill="#A0522D" stroke="#8B4513" strokeWidth="2" rx="10"/>
        {/* שולחן */}
        <rect x="25" y="25" width="70" height="70" fill="#F4A460" stroke="#A0522D" strokeWidth="2" rx="6"/>
        {/* טקסטורה */}
        <rect x="30" y="30" width="60" height="60" fill="none" stroke="#D2691E" strokeWidth="1" opacity="0.3" rx="3"/>
        {/* כיסאות לאורך הצלעות */}
        {Array.from({ length: totalChairCount }, (_, i) => {
          const pos = getChairPos(i);
          const { x, y, rotation } = pos;
          const seatW = pos?.seatW || 16;
          const seatH = pos?.seatH || 12;
          const backH = Math.max(4, Math.round(seatH * 0.33));
          const isOccupied = Boolean((Array.isArray(guests) ? guests[i] : undefined)) || i < occupiedCount;
          const isOverflowChair = i >= baseChairCount; // כסא אדום לחריגה
          
          // צבעים שונים לכסאות רגילים ואדומים
          let fill, stroke, backFill;
          if (isOverflowChair) {
            // כסא אדום לחריגה
            fill = isOccupied ? '#ef4444' : '#dc2626';
            stroke = isOccupied ? '#dc2626' : '#991b1b';
            backFill = isOccupied ? '#991b1b' : '#7f1d1d';
          } else {
            // כסא רגיל
            fill = isOccupied ? '#10b981' : '#171717';
            stroke = isOccupied ? '#0e9f6e' : '#333333';
            backFill = isOccupied ? '#0b7f5a' : '#333333';
          }
          
          return (
            <g key={i} transform={`rotate(${rotation} ${x} ${y})`}>
              <rect x={x - seatW / 2} y={y - seatH / 2} width={seatW} height={seatH} fill={fill} rx="3" ry="3" stroke={stroke} strokeWidth="1" />
              <rect x={x - seatW / 2} y={y - seatH / 2} width={seatW} height={backH} fill={backFill} rx="2" ry="2" />
            </g>
          );
        })}
        
        {/* מרכז השולחן - טקסט ישר במרובע/מלבן */}
        {safeTableNumber && (
          <text
            x="60"
            y="50"
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontWeight="bold"
          >
            {safeTableNumber}
          </text>
        )}
        
        {/* קטגוריה - טקסט ישר */}
        {categoryText && (
          <text
            x="60"
            y={safeTableNumber ? "65" : "55"}
            textAnchor="middle"
            fill="#FFD700"
            fontSize="10"
            fontWeight="600"
          >
            {categoryText}
          </text>
        )}
        
        {/* תווית נוספת */}
        <text
          x="60"
          y={safeTableNumber ? (categoryText ? "80" : "70") : (categoryText ? "70" : "65")}
          textAnchor="middle"
          fill="white"
          fontSize={fontSizeRect}
          fontWeight="bold"
          {...(rectNeedsCompress ? { lengthAdjust: 'spacingAndGlyphs', textLength: rectMaxWidth } : {})}
        >
          {safeLabel ? safeLabel : ''}
        </text>
      </svg>
    );
  };

  // שולחן מלבני (ארוך) — כסאות מודגשים לאורך הצדדים הארוכים
  const renderOblongTable = () => {
    // משטח חיצוני רחב ונמוך יותר למראה "ארוך" — מוגדל משמעותית
    const outer = { x: 2, y: 22, w: 116, h: 76 };
    // שטח השולחן הפנימי — ארוך ודק — מוגדל משמעותית
    const table = { x: 12, y: 34, w: 96, h: 52 };

    // זיהוי כיוון הצדדים הארוכים לפי יחס רוחב/גובה
    const isHorizontalLong = table.w >= table.h;

    // עדיפות גבוהה יותר לצדדים הארוכים (70%)
    const longCount = Math.ceil(totalChairCount * 0.7);
    const shortCount = totalChairCount - longCount;

    // פרמטרים לספייסינג הכיסאות — מעט גדולים וברורים יותר
    const SIDE_PADDING = 6, SEAT_GAP = 2, DEFAULT_SEAT_W = 18, SEAT_W_MIN = 9, SEAT_H = 14;
    const distribute = (count, start, length) => {
      const res = []; const usable = Math.max(0, length - 2 * SIDE_PADDING);
      for (let i = 0; i < count; i++) { const ratio = (i + 1) / (count + 1); res.push(start + SIDE_PADDING + ratio * usable); }
      return { points: res, usable };
    };
    const seatWidthFrom = (usable, count) => {
      const span = count > 0 ? usable / (count + 1) : usable; const allowed = span - SEAT_GAP;
      return allowed >= DEFAULT_SEAT_W ? DEFAULT_SEAT_W : Math.max(SEAT_W_MIN, allowed);
    };

    // קואורדינטות קבועות 12px מחוץ לשולחן
    const topY = table.y - 12, bottomY = table.y + table.h + 12;
    const leftX = table.x - 12, rightX = table.x + table.w + 12;

    // פיזור לפי כיוון הצד הארוך
    let positions = [];
    if (isHorizontalLong) {
      const top = distribute(Math.ceil(longCount / 2), table.x, table.w);
      const bottom = distribute(Math.floor(longCount / 2), table.x, table.w);
      const left = distribute(Math.ceil(shortCount / 2), table.y, table.h);
      const right = distribute(Math.floor(shortCount / 2), table.y, table.h);
      const tW = seatWidthFrom(top.usable, Math.ceil(longCount / 2));
      const bW = seatWidthFrom(bottom.usable, Math.floor(longCount / 2));
      const lW = seatWidthFrom(left.usable, Math.ceil(shortCount / 2));
      const rW = seatWidthFrom(right.usable, Math.floor(shortCount / 2));
      positions = [
        ...top.points.map(x => ({ x, y: topY, rotation: 0, seatW: tW, seatH: SEAT_H })),
        ...bottom.points.map(x => ({ x, y: bottomY, rotation: 180, seatW: bW, seatH: SEAT_H })),
        ...left.points.map(y => ({ x: leftX, y, rotation: -90, seatW: lW, seatH: SEAT_H })),
        ...right.points.map(y => ({ x: rightX, y, rotation: 90, seatW: rW, seatH: SEAT_H })),
      ];
    } else {
      const right = distribute(Math.ceil(longCount / 2), table.y, table.h);
      const left = distribute(Math.floor(longCount / 2), table.y, table.h);
      const top = distribute(Math.ceil(shortCount / 2), table.x, table.w);
      const bottom = distribute(Math.floor(shortCount / 2), table.x, table.w);
      const rW = seatWidthFrom(right.usable, Math.ceil(longCount / 2));
      const lW = seatWidthFrom(left.usable, Math.floor(longCount / 2));
      const tW = seatWidthFrom(top.usable, Math.ceil(shortCount / 2));
      const bW = seatWidthFrom(bottom.usable, Math.floor(shortCount / 2));
      positions = [
        ...right.points.map(y => ({ x: rightX, y, rotation: 90, seatW: rW, seatH: SEAT_H })),
        ...left.points.map(y => ({ x: leftX, y, rotation: -90, seatW: lW, seatH: SEAT_H })),
        ...top.points.map(x => ({ x, y: topY, rotation: 0, seatW: tW, seatH: SEAT_H })),
        ...bottom.points.map(x => ({ x, y: bottomY, rotation: 180, seatW: bW, seatH: SEAT_H })),
      ];
    }

    return (
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
        {/* צל עדין */}
        <rect x={outer.x + 2} y={outer.y + 2} width={outer.w + 4} height={outer.h + 4} fill="rgba(0,0,0,0.08)" rx={12} />
        {/* מסגרת חיצונית */}
        <rect x={outer.x} y={outer.y} width={outer.w} height={outer.h} fill="#A0522D" stroke="#8B4513" strokeWidth="2" rx={10} />
        {/* משטח השולחן */}
        <rect x={table.x} y={table.y} width={table.w} height={table.h} fill="#F4A460" stroke="#A0522D" strokeWidth="2" rx={6} />
        {/* טקסטורה פנימית */}
        <rect x={table.x + 5} y={table.y + 5} width={table.w - 10} height={table.h - 10} fill="none" stroke="#D2691E" strokeWidth="1" opacity="0.3" rx={3} />
        {/* כיסאות */}
        {positions.map((p, i) => {
          const { x, y, rotation, seatW, seatH } = p;
          const isOccupied = Boolean((Array.isArray(guests) ? guests[i] : undefined)) || i < occupiedCount;
          const isOverflowChair = i >= baseChairCount; // כסא אדום לחריגה
          const backH = Math.max(4, Math.round(seatH * 0.33));
          
          // צבעים שונים לכסאות רגילים ואדומים
          let fill, stroke, backFill;
          if (isOverflowChair) {
            // כסא אדום לחריגה
            fill = isOccupied ? '#ef4444' : '#dc2626';
            stroke = isOccupied ? '#dc2626' : '#991b1b';
            backFill = isOccupied ? '#991b1b' : '#7f1d1d';
          } else {
            // כסא רגיל
            fill = isOccupied ? '#10b981' : '#171717';
            stroke = isOccupied ? '#0e9f6e' : '#333333';
            backFill = isOccupied ? '#0b7f5a' : '#333333';
          }
          
          return (
            <g key={i} transform={`rotate(${rotation} ${x} ${y})`}>
              <rect x={x - seatW / 2} y={y - seatH / 2} width={seatW} height={seatH} fill={fill} rx={3} ry={3} stroke={stroke} strokeWidth={1} />
              <rect x={x - seatW / 2} y={y - seatH / 2} width={seatW} height={backH} fill={backFill} rx={2} ry={2} />
            </g>
          );
        })}
        {/* מרכז השולחן - טקסט ישר במלבן */}
        {safeTableNumber && (
          <text
            x="60"
            y="50"
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontWeight="bold"
          >
            {safeTableNumber}
          </text>
        )}
        
        {/* קטגוריה - טקסט ישר */}
        {categoryText && (
          <text
            x="60"
            y={safeTableNumber ? "65" : "55"}
            textAnchor="middle"
            fill="#FFD700"
            fontSize="10"
            fontWeight="600"
          >
            {categoryText}
          </text>
        )}
        
        {/* תווית נוספת */}
        <text
          x="60"
          y={safeTableNumber ? (categoryText ? "80" : "70") : (categoryText ? "70" : "62")}
          textAnchor="middle"
          fill="white"
          fontSize={fontSizeRect}
          fontWeight="bold"
          {...(rectNeedsCompress ? { lengthAdjust: 'spacingAndGlyphs', textLength: rectMaxWidth } : {})}
        >
          {safeLabel ? safeLabel : ''}
        </text>
      </svg>
    );
  };

  return (
    <div
      style={{
        ...defaultStyle,
        ...style,
        position: 'relative',
        userSelect: 'none',
        zIndex: 5,
        cursor: isViewer ? 'default' : 'move',
        filter: isDragging ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' : 'none',
        transform: isDragging ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform 0.2s ease, filter 0.2s ease'
      }}
    >
      {/* השולחן עצמו */}
      <div onMouseDown={onMouseDown}>
        {shape === 'circular' ? renderCircularTable() : shape === 'rectangular' ? renderRectangularTable() : renderOblongTable()}
        
        {/* שכבת ידיות גרירה מעל ה-SVG */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 120, height: 120, pointerEvents: 'none' }}>
          {Array.from({ length: totalChairCount }, (_, i) => (
            <ChairHandle key={`handle-${i}`} index={i} />
          ))}
        </div>
      </div>


    </div>
  );
};

export default TableVisual; 