import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Start from './pages/Start'; //strona przed logowaniem
import Dashboard from './pages/Dashboard'; //strona po zalogowaniu (wczesniej App.jsx)
import New_experiment from './pages/New_experiment'; //dodawanie nowego eksperymentu
import Experiment_details from './pages/Experiment_details'; //szczegoly eksperymentu
import Experiment_edit from './pages/Experiment_edit'; //edycja eksperymentu
import Profile from './pages/Profile'; //edycja eksperymentu
import SavedFrames from './pages/SavedFrames';
import ProtectedRoute from './ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/new-experiment" element={<ProtectedRoute><New_experiment /></ProtectedRoute>} />
        <Route path="/experiment/:id" element={<ProtectedRoute><Experiment_details /></ProtectedRoute>} />
        <Route path="/experiment/:id/edit" element={<ProtectedRoute><Experiment_edit /></ProtectedRoute>} />
        <Route path="/experiment/:id/frames" element={<ProtectedRoute><SavedFrames /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </Router>
  );
}

export default App;
