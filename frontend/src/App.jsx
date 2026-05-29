import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Start from './pages/Start'; //strona przed logowaniem
import Dashboard from './pages/Dashboard'; //strona po zalogowaniu (wczesniej App.jsx)
import New_experiment from './pages/New_experiment'; //dodawanie nowego eksperymentu

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new-experiment" element={<New_experiment />} />
      </Routes>
    </Router>
  );
}

export default App;