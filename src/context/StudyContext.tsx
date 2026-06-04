import { createContext, useContext, useState, ReactNode } from 'react';

interface StudyContextType {
  topic: string;
  setTopic: (topic: string) => void;
  selectedMode: any;
  setSelectedMode: (mode: any) => void;
  uploadedFile: any;
  setUploadedFile: (file: any) => void;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [topic, setTopic] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<any>(null);

  return (
    <StudyContext.Provider value={{ topic, setTopic, selectedMode, setSelectedMode, uploadedFile, setUploadedFile }}>
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return context;
}
