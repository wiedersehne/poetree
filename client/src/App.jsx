import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Exhibition from './pages/Exhibition';
import Upload from './pages/Upload';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Exhibition />} />
        <Route path="/upload" element={<Upload />} />
      </Routes>
    </Layout>
  );
}
