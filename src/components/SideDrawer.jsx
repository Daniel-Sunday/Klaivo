export default function SideDrawer({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[#1A1A24] w-80 h-full ml-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-[#F0F0F5]">Menu</h2>
          <button onClick={onClose} className="text-[#6B6B80] hover:text-[#F0F0F5]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <nav className="space-y-4">
          <a href="#" className="block text-[#CACAD5] hover:text-[#4F8EF7] transition-colors">Product</a>
          <a href="#" className="block text-[#CACAD5] hover:text-[#4F8EF7] transition-colors">Features</a>
          <a href="#" className="block text-[#CACAD5] hover:text-[#4F8EF7] transition-colors">Pricing</a>
          <a href="#" className="block text-[#CACAD5] hover:text-[#4F8EF7] transition-colors">FAQ</a>
        </nav>
      </div>
    </div>
  )
}
