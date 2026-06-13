

export type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'pro';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose?: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  let icon = 'info';
  let iconColor = 'var(--accent)';
  let borderColor = 'var(--accent-border)';

  if (type === 'success') {
    icon = 'check_circle';
    iconColor = 'var(--success)';
    borderColor = 'rgba(74, 222, 128, 0.3)';
  } else if (type === 'error') {
    icon = 'error';
    iconColor = 'var(--danger)';
    borderColor = 'rgba(248, 113, 113, 0.3)';
  } else if (type === 'warning') {
    icon = 'warning';
    iconColor = '#F59E0B';
    borderColor = 'rgba(245, 158, 11, 0.3)';
  } else if (type === 'pro' || message.startsWith('◆')) {
    icon = 'workspace_premium';
    iconColor = 'var(--accent)';
    borderColor = 'rgba(79, 142, 247, 0.4)';
  }

  // Strip prefix ◆ from message if present for cleaner rendering
  const displayMessage = message.startsWith('◆') ? message.substring(1).trim() : message;

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md transition-all duration-300 font-medium text-sm animate-fade-in-down w-full max-w-sm"
      style={{
        background: 'var(--surface-low)',
        color: 'var(--text-primary)',
        border: `1px solid ${borderColor}`,
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
      }}
    >
      <span
        className="material-symbols-outlined text-[20px] select-none shrink-0"
        style={{ color: iconColor }}
      >
        {icon}
      </span>
      <span className="flex-grow text-left leading-snug">{displayMessage}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-text-secondary hover:text-text-primary text-xs bg-transparent border-none cursor-pointer p-0.5 flex items-center justify-center rounded-full hover:bg-white/5 shrink-0"
          aria-label="Dismiss toast"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
}
