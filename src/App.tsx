import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { AppDetail } from './pages/AppDetail';
import { Submit } from './pages/Submit';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Whitepapers } from './pages/Whitepapers';
import { Templates } from './pages/Templates';
import { Profile } from './pages/Profile';
import { OnboardingModal } from './components/OnboardingModal/OnboardingModal';

function App() {
  return (
    <Router>
      <OnboardingModal />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app/:slug" element={<AppDetail />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/whitepapers" element={<Whitepapers />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
