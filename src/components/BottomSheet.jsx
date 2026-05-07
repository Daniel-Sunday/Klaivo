export default function BottomSheet({ isOpen, onClose, topic, selectedMode, uploadedFile }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[#1A1A24] w-full max-w-lg rounded-t-3xl p-6 pb-8">
        <div className="w-12 h-1 bg-[#6B6B80] rounded-full mx-auto mb-6" />
        <h2 className="text-xl font-bold text-[#F0F0F5] mb-4">Processing your request...</h2>
        <p className="text-[#CACAD5] text-sm">Topic: {topic}</p>
        <p className="text-[#CACAD5] text-sm">Mode: {selectedMode}</p>
        {uploadedFile && <p className="text-[#CACAD5] text-sm">File: {uploadedFile.name}</p>}
      </div>
    </div>
  )
}
