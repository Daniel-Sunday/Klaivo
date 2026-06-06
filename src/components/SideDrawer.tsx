import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideDrawer({ isOpen, onClose }: SideDrawerProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isPro = profile?.is_pro || false;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Drawer Body */}
      <div className="relative bg-[#1A1A24] w-80 h-full ml-auto p-6 flex flex-col justify-between z-10">
        <div>
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-[#F0F0F5] font-['Manrope',sans-serif]">Menu</h2>
            <button onClick={onClose} className="text-[#6B6B80] hover:text-[#F0F0F5] bg-transparent border-none cursor-pointer flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          
          {/* Navigation Links */}
          <nav className="space-y-4 flex flex-col items-start font-['Inter',sans-serif]">
            <button
              onClick={() => {
                navigate('/history');
                onClose();
              }}
              className="block text-left bg-transparent border-none text-[#CACAD5] hover:text-[#4F8EF7] transition-colors font-medium text-base cursor-pointer p-0 font-body"
            >
              Study History
            </button>
            <button
              onClick={() => {
                navigate('/settings');
                onClose();
              }}
              className="block text-left bg-transparent border-none text-[#CACAD5] hover:text-[#4F8EF7] transition-colors font-medium text-base cursor-pointer p-0 font-body"
            >
              Settings
            </button>
            <a href="#" className="block text-[#CACAD5] hover:text-[#4F8EF7] transition-colors text-base font-medium">Product</a>
            <a href="#" className="block text-[#CACAD5] hover:text-[#4F8EF7] transition-colors text-base font-medium">Features</a>
            <a href="#" className="block text-[#CACAD5] hover:text-[#4F8EF7] transition-colors text-base font-medium">Pricing</a>
            <a href="#" className="block text-[#CACAD5] hover:text-[#4F8EF7] transition-colors text-base font-medium">FAQ</a>
          </nav>
        </div>
        
        {/* Footer Pro Upgrade Badge/Button */}
        <div className="pt-6 border-t border-white/5 font-['Inter',sans-serif]">
          {!isPro ? (
            <button
              onClick={() => {
                navigate('/upgrade');
                onClose();
              }}
              className="w-full bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white font-semibold text-sm py-3 px-4 rounded-xl transition-colors text-center cursor-pointer border-none shadow-[0_4px_12px_rgba(79,142,247,0.2)] active:scale-[0.98]"
            >
              Upgrade to Pro ◆
            </button>
          ) : (
            <div className="flex items-center justify-center gap-1.5 py-3 px-4 bg-[#30D158]/10 border border-[#30D158]/20 rounded-xl text-[#30D158] font-bold text-sm select-none">
              <span>Pro Member ◆</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
