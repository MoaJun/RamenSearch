
import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  show: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, show }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300); // Wait for fade-out animation
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center p-4 mb-4 text-sm font-semibold text-green-100 bg-green-600 rounded-lg shadow-lg transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'
      }`}
      role="alert"
    >
      <CheckCircle className="w-5 h-5 mr-3" />
      <span className="font-medium">{message}</span>
    </div>
  );
};

export default Toast;
