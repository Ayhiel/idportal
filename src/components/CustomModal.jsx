import Modal from 'react-modal';

export default function CustomModal({ isOpen, onClose, onConfirm, title, message, showConfirm = false }) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-auto"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <p className="mb-6">{message}</p>
      <div className="flex justify-end gap-2">
        {showConfirm && (
          <button onClick={onConfirm} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Confirm
          </button>
        )}
        <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
          {showConfirm ? 'Cancel' : 'Close'}
        </button>
      </div>
    </Modal>
  );
}
