import { Navigate, Route, Routes } from 'react-router'
import MarqueeViewer from '@/src/pages/MarqueeViewer'
import UploadPage from '@/src/pages/UploadPage'
import AdminPage from '@/src/pages/AdminPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MarqueeViewer />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
