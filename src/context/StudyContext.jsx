import { createContext, useContext, useState } from 'react'

const StudyContext = createContext()

export function StudyProvider({ children }) {
  const [topic, setTopic] = useState('')
  const [selectedMode, setSelectedMode] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)

  return (
    <StudyContext.Provider value={{ topic, setTopic, selectedMode, setSelectedMode, uploadedFile, setUploadedFile }}>
      {children}
    </StudyContext.Provider>
  )
}

export function useStudy() {
  const context = useContext(StudyContext)
  if (!context) {
    throw new Error('useStudy must be used within a StudyProvider')
  }
  return context
}
