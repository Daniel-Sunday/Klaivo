interface InstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallBanner({ onInstall, onDismiss }: InstallBannerProps) {
  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl p-4 flex items-center gap-3"
      style={{ background: 'var(--surface-high)', border: '1px solid var(--accent-border)' }}
    >
      <div className="text-2xl font-bold flex-shrink-0" style={{ color: 'var(--accent)', fontFamily: 'Manrope' }}>K</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Add Klaivo to your home screen</div>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Faster access, feels like an app</div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={onDismiss} className="text-xs px-3 py-1.5 rounded-full ghost-border cursor-pointer" style={{ color: 'var(--text-secondary)' }}>Not now</button>
        <button onClick={onInstall} className="text-xs px-3 py-1.5 rounded-full text-white font-semibold cursor-pointer" style={{ background: 'var(--accent)' }}>Add</button>
      </div>
    </div>
  );
}
