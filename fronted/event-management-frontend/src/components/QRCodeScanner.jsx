import React, { useState, useEffect } from 'react';
import './QRCodeScanner.css';

const QRCodeScanner = ({ eventId, onScan }) => {
  const [scanning, setScanning] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const handleScan = async () => {
    if (!qrCode.trim()) return;
    
    setScanning(true);
    setScanResult(null);
    
    const requestData = {
      qr_code: qrCode,
      event_id: eventId
    };
    
    console.log('Sending scan request:', requestData);
    console.log('QR Code being scanned:', qrCode);
    console.log('Event ID:', eventId);
    
    try {
      const response = await fetch('http://localhost:8001/realtime/scan-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Scan result:', result);
      console.log('Guest details:', result.guest);
      console.log('Has seating:', result.has_seating);
      
      if (result.status === 'success') {
        setScanResult({
          type: 'success',
          message: result.message,
          guest: result.guest,
          hasSeating: result.has_seating
        });
        onScan && onScan(result);
        setQrCode('');
        
        // לא מרעננים את כל העמוד כדי לשמור על הטאב הנוכחי.
        // ה-RealTimeDashboard כבר מאזין ל-WebSocket ומרענן נתונים דרך loadData()
      } else {
        console.log('Scan failed with status:', result.status);
        console.log('Error message:', result.message);
        setScanResult({
          type: 'warning',
          message: result.message
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      setScanResult({
        type: 'error',
        message: `שגיאה בסריקת הברקוד: ${error.message}`
      });
    } finally {
      setScanning(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const clearResult = () => {
    setScanResult(null);
  };

  useEffect(() => {
    if (scanResult) {
      const timer = setTimeout(clearResult, 5000);
      return () => clearTimeout(timer);
    }
  }, [scanResult]);

  return (
    <div className="qr-scanner-container">
      <div className="scanner-header">
        <div className="scanner-icon">📱</div>
        <h3 className="scanner-title">סריקת ברקוד QR</h3>
        <div className="scanner-subtitle">הכנס קוד QR או סרוק ברקוד</div>
      </div>

      <div className="scanner-input-section">
        <div className="input-wrapper">
          <div className="input-icon">🔍</div>
          <input
            type="text"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="הכנס קוד QR כאן..."
            className="qr-input"
            disabled={scanning}
          />
          <button 
            onClick={handleScan}
            disabled={scanning || !qrCode.trim()}
            className={`scan-button ${scanning ? 'scanning' : ''}`}
          >
            {scanning ? (
              <>
                <div className="spinner"></div>
                <span>סורק...</span>
              </>
            ) : (
              <>
                <span className="button-icon">📷</span>
                <span>סרוק</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div className={`scan-result ${scanResult.type}`}>
          <div className="result-icon">
            {scanResult.type === 'success' ? '✅' : 
             scanResult.type === 'warning' ? '⚠️' : '❌'}
          </div>
          <div className="result-content">
            <div className="result-message">{scanResult.message}</div>
            {scanResult.guest && (
              <div className="guest-result">
                <div className="guest-name">{scanResult.guest.name}</div>
                {scanResult.hasSeating ? (
                  <div className="seating-status success">
                    <span className="status-icon">📍</span>
                    <span>יש מקום ישיבה</span>
                  </div>
                ) : (
                  <div className="seating-status warning">
                    <span className="status-icon">⚠️</span>
                    <span>ללא מקום ישיבה</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={clearResult} className="close-result">×</button>
        </div>
      )}

      {/* Scanner Tips */}
      <div className="scanner-tips">
        <div className="tip-item">
          <div className="tip-icon">💡</div>
          <div className="tip-text">הקלד את הקוד או השתמש בסורק ברקוד</div>
        </div>
        <div className="tip-item">
          <div className="tip-icon">⚡</div>
          <div className="tip-text">התראות יופיעו מיד כשמוזמן ייכנס</div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="connection-indicator">
        <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
        <span className="status-text">
          {isConnected ? 'מחובר למערכת זמן אמת' : 'מנותק מהמערכת'}
        </span>
      </div>
    </div>
  );
};

export default QRCodeScanner; 