import { Toast } from '@openedx/paragon';
import {
  createContext, useContext, useState, useCallback,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [message, setMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setMessage(msg);
  }, []);

  const closeToast = () => setMessage(null);

  const value = useMemo(() => ({
    showToast,
  }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <Toast show={Boolean(message)} onClose={closeToast}>
        {message}
      </Toast>
    </ToastContext.Provider>
  );
};

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useToast() {
  return useContext(ToastContext);
}
