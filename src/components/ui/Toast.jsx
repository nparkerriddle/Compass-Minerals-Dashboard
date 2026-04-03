import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ message, type = 'success', duration = 3500 }) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const icons = {
    success: <CheckCircle size={16} className="text-green-500 shrink-0" />,
    error:   <XCircle size={16} className="text-red-500 shrink-0" />,
    warning: <AlertCircle size={16} className="text-yellow-500 shrink-0" />,
  };
  return (
    <div className="pointer-events-auto flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-800 min-w-[220px] max-w-sm">
      {icons[toast.type] || icons.success}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 ml-1">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
