import { Routes, Route } from 'react-router-dom'
import WalletView from './views/WalletView'
import SetupView from './views/SetupView'
import SendView from './views/SendView'
import HistoryView from './views/HistoryView'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WalletView />} />
      <Route path="/setup" element={<SetupView />} />
      <Route path="/send" element={<SendView />} />
      <Route path="/history" element={<HistoryView />} />
    </Routes>
  )
}
