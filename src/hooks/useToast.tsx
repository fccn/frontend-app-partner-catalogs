import { Toast } from '@openedx/paragon';
import {
  createContext, useContext, useState, useCallback,
  useMemo,
  FC,
  ReactNode,
} from 'react';

interface ToastProviderInterface {
  children: ReactNode
}

interface ToastContextType {
  showToast: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: FC<ToastProviderInterface> = ({ children }) => {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string): void => {
    setMessage(msg);
  }, []);

  const closeToast = () => setMessage(null);

  const value = useMemo(() => ({
    showToast,
  }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <Toast show={!!message} onClose={closeToast}>
        {message ?? ''}
      </Toast>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}
