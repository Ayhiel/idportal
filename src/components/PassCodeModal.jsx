import { useState } from 'react';
import Modal from 'react-modal';

export default function PassCodeModal({ isOpen, onClose, onConfirm, title, message, showConfirm }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const isValid = onConfirm(passcode);
    
    if (isValid === false) {
      setError('Incorrect passcode. Please try again.');
      setPasscode('');
    } else {
      setError('');
      setPasscode('');
    }
  };

  const handleClose = () => {
    setPasscode('');
    setError('');
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && passcode) {
      handleConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-auto mt-20"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
      
      <input
        type="password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Enter passcode"
        className="w-full px-3 py-2 border border-gray-300 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      {error && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <div className="flex justify-end gap-2 mt-4">
        {showConfirm && (
          <button 
            onClick={handleConfirm} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={!passcode}
          >
            Submit
          </button>
        )}
        <button onClick={handleClose} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
          {showConfirm ? 'Cancel' : 'Close'}
        </button>
      </div>
    </Modal>
  );
}