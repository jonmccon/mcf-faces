import { useEffect } from 'react';

/**
 * Toast notification component for user feedback
 * 
 * @param {object} props
 * @param {string} props.message - The message to display
 * @param {string} props.type - Type of toast: 'success', 'error', 'info'
 * @param {function} props.onUndo - Optional undo callback
 * @param {function} props.onClose - Callback when toast is closed/expires
 * @param {number} props.duration - Duration in ms before auto-close (default: 5000)
 */
function Toast({ message, type = 'success', onUndo, onClose, duration = 5000 }) {
  useEffect(() => {
    if (!onClose) return;
    
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [onClose, duration]);
  
  if (!message) return null;
  
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-message">{message}</span>
      {onUndo && (
        <button 
          className="toast-undo-btn"
          onClick={onUndo}
          aria-label="Undo action"
        >
          Undo
        </button>
      )}
      {onClose && (
        <button 
          className="toast-close-btn"
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default Toast;
