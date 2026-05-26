import Modal from 'react-modal';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';

const modalStyles = {
  success: {
    icon: CheckCircleIcon,
    iconClass: 'text-green-600',
    iconBg: 'bg-green-100',
    titleClass: 'text-green-800',
    messageClass: 'text-green-700',
    confirmClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    iconClass: 'text-amber-600',
    iconBg: 'bg-amber-100',
    titleClass: 'text-amber-800',
    messageClass: 'text-amber-700',
    confirmClass: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  },
  danger: {
    icon: XCircleIcon,
    iconClass: 'text-red-600',
    iconBg: 'bg-red-100',
    titleClass: 'text-red-800',
    messageClass: 'text-red-700',
    confirmClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  confirm: {
    icon: QuestionMarkCircleIcon,
    iconClass: 'text-sky-700',
    iconBg: 'bg-sky-100',
    titleClass: 'text-sky-900',
    messageClass: 'text-gray-600',
    confirmClass: 'bg-sky-700 hover:bg-sky-800 focus:ring-sky-500',
  },
  info: {
    icon: InformationCircleIcon,
    iconClass: 'text-sky-700',
    iconBg: 'bg-sky-100',
    titleClass: 'text-sky-900',
    messageClass: 'text-gray-600',
    confirmClass: 'bg-sky-700 hover:bg-sky-800 focus:ring-sky-500',
  },
};

const getModalType = (title = '', message = '', showConfirm = false) => {
  const text = `${title} ${message}`.toLowerCase();

  if (text.includes('success') || text.includes('added') || text.includes('updated') || text.includes('created')) {
    return 'success';
  }

  if (text.includes('delete') || text.includes('failed') || text.includes('error')) {
    return 'danger';
  }

  if (text.includes('warning') || text.includes('already exists') || text.includes('select') || text.includes('incorrect')) {
    return 'warning';
  }

  if (showConfirm || text.includes('confirm') || text.includes('are you sure')) {
    return 'confirm';
  }

  return 'info';
};

export default function CustomModal({ isOpen, onClose, onConfirm, title, showConfirm }) {
  const type = getModalType(title, showConfirm);
  const style = modalStyles[type];
  const Icon = style.icon;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-[90vw] mx-auto outline-none"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${style.iconBg}`}>
          <Icon className={`h-7 w-7 ${style.iconClass}`} />
        </div>
        <div>
          <h2 className={`text-xl text-center font-bold ${style.titleClass}`}>{title}</h2>
          {/* <p className={`mt-2 text-sm leading-6 ${style.messageClass}`}>{message}</p> */}
        </div>
      </div>
      <div className="flex justify-center gap-2">
        {showConfirm && (
          <button
            onClick={onConfirm}
            className={`${style.confirmClass} w-full text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            Confirm
          </button>
        )}
        <button onClick={onClose} className="w-full bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
          {showConfirm ? 'Cancel' : 'OK'}
        </button>
      </div>
    </Modal>
  );
}
