import React, { useState } from 'react';
import TableHeadsTab from './TableHeadsTab';
import GuestsContent from './GuestsContent';

export default function GuestList({ eventId }) {
  console.log('GuestList: eventId from props:', eventId);
  const [activeTab, setActiveTab] = useState('guests');

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('guests')}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'guests' ? '#4f8cff' : '#e2e8f0',
            color: activeTab === 'guests' ? 'white' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            flex: 1
          }}
        >
          רשימת מוזמנים
        </button>
        <button
          onClick={() => setActiveTab('tableHeads')}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'tableHeads' ? '#4f8cff' : '#e2e8f0',
            color: activeTab === 'tableHeads' ? 'white' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            flex: 1
          }}
        >
          ראשי שולחן
        </button>
      </div>

      {activeTab === 'guests' ? <GuestsContent /> : <TableHeadsTab />}
    </div>
  );
}