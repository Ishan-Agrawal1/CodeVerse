import './App.css';
import { Routes, Route } from "react-router-dom";
import LandingPage from './components/LandingPage';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import MyWorkspacesPage from './components/MyWorkspacesPage';
import EditorPage from './components/EditorPage';
import WorkspaceFilesPage from './components/WorkspaceFilesPage';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <div>
        <Toaster position='top-center'></Toaster>
      </div>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/dashboard' element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/workspaces' element={
          <ProtectedRoute>
            <MyWorkspacesPage />
          </ProtectedRoute>
        } />
        <Route path='/workspace/:workspaceId' element={
          <ProtectedRoute>
            <WorkspaceFilesPage />
          </ProtectedRoute>
        } />
        <Route path='/legacy' element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path='/editor/:roomId' element={
          <ProtectedRoute>
            <EditorPage />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;
