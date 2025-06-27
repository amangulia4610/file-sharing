import Sender from './components/Sender';
import Receiver from './components/Receiver';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Sender />} />
        <Route path="/receive/:session" element={<Receiver />} />
      </Routes>
    </BrowserRouter>
  );
}