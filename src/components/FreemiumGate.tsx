interface FreemiumGateProps {
  feature: string;
  onUpgrade: () => void;
}

export function FreemiumGate({ feature, onUpgrade }: FreemiumGateProps) {
  return (
    <div className="rounded-xl p-4 border text-center" style={{ background: 'var(--surface-low)', borderColor: 'var(--accent-border)' }}>
      <div className="text-sm font-medium mb-1" style={{ color: 'var(--accent)' }}>◆ Pro feature</div>
      <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
        {feature} is available on Klaivo Pro.
      </div>
      <button onClick={onUpgrade} className="text-white rounded-full px-4 py-2 text-xs font-semibold border-none cursor-pointer" style={{ background: 'var(--accent)' }}>
        Get access →
      </button>
    </div>
  );
}

export default FreemiumGate;
