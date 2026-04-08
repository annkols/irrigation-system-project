import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Start from './pages/Start'; //strona przed logowaniem
import Dashboard from './pages/Dashboard'; //strona po zalogowaniu (wczesniej App.jsx)

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;