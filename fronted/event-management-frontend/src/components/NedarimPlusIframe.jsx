import React, { useState, useEffect, useRef } from 'react';

/**
 * Component לאייפרם של נדרים פלוס
 * מבוסס על התיעוד הרשמי של נדרים פלוס
 * 
 * @param {Object} props
 * @param {Object} props.paymentData - נתוני התשלום (Mosad, ApiValid, Amount, וכו')
 * @param {Function} props.onTransactionComplete - callback שנקרא כשהתשלום הושלם
 * @param {Function} props.onTransactionError - callback שנקרא כשיש שגיאה
 * @param {string} props.language - שפה (he/en)
 */
export default function NedarimPlusIframe({
  paymentData,
  onTransactionComplete,
  onTransactionError,
  language = 'he'
}) {
  const [iframeHeight, setIframeHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const iframeRef = useRef(null);

  // פונקציה לשליחת מסרים ל-iframe
  const postNedarim = (data) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(data, "*");
    }
  };

  // פונקציה לקבלת מסרים מה-iframe
  const readPostMessage = (event) => {
    console.log('[NedarimPlus] Received message:', event.data);
    
    switch (event.data.Name) {
      case 'Height':
        // עדכון גובה ה-iframe
        setIframeHeight(parseInt(event.data.Value) + 15);
        setIsLoading(false);
        break;

      case 'TransactionResponse':
        console.log('[NedarimPlus] Transaction Response:', event.data.Value);
        
        if (event.data.Value.Status === 'Error') {
          // שגיאה בעסקה
          setErrorMessage(event.data.Value.Message || 'שגיאה בביצוע העסקה');
          setIsProcessing(false);
          if (onTransactionError) {
            onTransactionError(event.data.Value);
          }
        } else {
          // עסקה הצליחה
          setIsProcessing(false);
          if (onTransactionComplete) {
            onTransactionComplete(event.data.Value);
          }
        }
        break;

      default:
        console.log('[NedarimPlus] Unknown message type:', event.data.Name);
    }
  };

  // הגדרת event listener לקבלת מסרים מה-iframe
  useEffect(() => {
    const handleMessage = (event) => readPostMessage(event);
    
    if (window.addEventListener) {
      window.addEventListener("message", handleMessage, false);
    } else {
      window.attachEvent("onmessage", handleMessage);
    }

    return () => {
      if (window.removeEventListener) {
        window.removeEventListener("message", handleMessage, false);
      } else {
        window.detachEvent("onmessage", handleMessage);
      }
    };
  }, [onTransactionComplete, onTransactionError]);

  // טעינת ה-iframe
  const handleIframeLoad = () => {
    console.log('[NedarimPlus] Iframe loaded');
    // בקש גובה ראשוני
    postNedarim({ Name: 'GetHeight' });
  };

  // פונקציה לביצוע התשלום
  const executePayment = () => {
    console.log('[NedarimPlus] Executing payment with data:', paymentData);
    setIsProcessing(true);
    setErrorMessage('');
    
    const paymentPayload = {
      Name: 'FinishTransaction2',
      Value: {
        Mosad: paymentData.Mosad || '',
        ApiValid: paymentData.ApiValid || '',
        PaymentType: paymentData.PaymentType || 'Ragil',
        Currency: paymentData.Currency || '1',
        
        Zeout: paymentData.Zeout || '',
        FirstName: paymentData.FirstName || '',
        LastName: paymentData.LastName || '',
        Street: paymentData.Street || '',
        City: paymentData.City || '',
        Phone: paymentData.Phone || '',
        Mail: paymentData.Mail || '',
        
        Amount: paymentData.Amount || 0,
        Tashlumim: paymentData.Tashlumim || '1',
        Day: paymentData.Day || '',  // רק להוראת קבע
        
        Groupe: paymentData.Groupe || '',
        Comment: paymentData.Comment || '',
        
        Param1: paymentData.Param1 || '',
        Param2: paymentData.Param2 || '',
        ForceUpdateMatching: paymentData.ForceUpdateMatching || '0',
        
        CallBack: paymentData.CallBack || '',
        CallBackMailError: paymentData.CallBackMailError || ''
      }
    };
    
    console.log('[NedarimPlus] Sending payment payload:', paymentPayload);
    postNedarim(paymentPayload);
  };

  // חשוף את executePayment כך שהורה יוכל לקרוא לו
  useEffect(() => {
    if (paymentData.autoExecute) {
      // אם מבוקש ביצוע אוטומטי
      const timer = setTimeout(() => {
        if (!isLoading) {
          executePayment();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, paymentData.autoExecute]);

  const iframeUrl = `https://matara.pro/nedarimplus/iframe${language === 'he' ? '' : '?language=en'}`;

  return (
    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      {/* Iframe container */}
      <div style={{ 
        border: '2px solid #e2e8f0', 
        borderRadius: '12px', 
        overflow: 'hidden',
        backgroundColor: '#fff',
        position: 'relative'
      }}>
        <iframe
          ref={iframeRef}
          id="NedarimFrame"
          src={iframeUrl}
          onLoad={handleIframeLoad}
          style={{
            width: '100%',
            height: iframeHeight ? `${iframeHeight}px` : '400px',
            border: 'none',
            display: 'block'
          }}
          scrolling="no"
          title="Nedarim Plus Payment"
        />
        
        {/* כפתור לשליחת נתוני התשלום */}
        {!isLoading && !isProcessing && (
          <div style={{ 
            padding: '16px', 
            textAlign: 'center',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button 
              onClick={executePayment}
              style={{
                padding: '12px 24px',
                background: '#0ea5e9',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              לתשלום
            </button>
          </div>
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div style={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px', 
            textAlign: 'center', 
            color: '#64748b',
            fontFamily: 'Assistant, Arial',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '8px',
            zIndex: 10
          }}>
            <div style={{ 
              width: '30px', 
              height: '30px', 
              margin: '0 auto 8px',
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #4f46e5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            טוען...
          </div>
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: '8px',
          fontWeight: 600
        }}>
          {errorMessage}
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          textAlign: 'center',
          color: '#64748b',
          fontFamily: 'Assistant, Arial'
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            margin: '0 auto 12px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #10b981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          מבצע חיוב, נא להמתין...
        </div>
      )}

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Export גם את הפונקציה לקריאה ידנית לביצוע תשלום
export { NedarimPlusIframe };

