import { createContext, useContext, useState, ReactNode } from 'react';
import { Toast, ToastType } from '../components/Toast';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function toFriendlyError(message: string): string {
  const msg = message.toLowerCase();
  
  if (msg.includes('free_limit_reached') || msg.includes('limit reached')) {
    return "You've used your daily study limit. Upgrade to Pro for unlimited access.";
  }
  if (msg.includes('rate_limit_exceeded') || msg.includes('too many requests')) {
    return "We're receiving a lot of requests. Please take a deep breath and try again shortly.";
  }
  if (msg.includes('not_authenticated') || msg.includes('session expired') || msg.includes('unauthenticated')) {
    return "Your session has expired. Please sign in again.";
  }
  if (msg.includes('refine')) {
    return "Something interrupted refining your answer. Please try again.";
  }
  if (msg.includes('update level') || msg.includes('save academic level')) {
    return "Something interrupted updating your academic level. Please try again.";
  }
  if (msg.includes('delete')) {
    return "Something interrupted deleting your data. Please try again.";
  }
  if (msg.includes('follow up') || msg.includes('send follow-up')) {
    return "Something interrupted sending your follow-up. Please try again.";
  }
  if (msg.includes('copy link') || msg.includes('share link')) {
    return "Something interrupted copying the link. Please try again.";
  }
  if (msg.includes('report')) {
    return "Something interrupted sending your report. Please try again.";
  }
  if (msg.includes('quiz')) {
    return "Something interrupted generating your quiz. Let's try again.";
  }
  if (msg.includes('flashcard')) {
    return "Something interrupted generating your flashcards. Let's try again.";
  }
  if (msg.includes('session') || msg.includes('load')) {
    return "Something interrupted loading this session. Please try again.";
  }
  if (msg.includes('invalid')) {
    return "Please check this link and try again.";
  }
  
  // Generic fallback replacement for "failed" / "error"
  if (msg.includes('failed') || msg.includes('error')) {
    return message
      .replace(/failed to /i, 'something interrupted ')
      .replace(/failed/i, 'something went wrong')
      .replace(/error/i, 'something went wrong');
  }
  
  return message;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: ToastType = 'default', duration = 3000) => {
    const id = Date.now();
    const finalMessage = type === 'error' ? toFriendlyError(message) : message;
    
    setToasts((prev) => [...prev, { id, message: finalMessage, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-sm sm:max-w-md">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
