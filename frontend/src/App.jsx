import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Start from './pages/Start'; //strona przed logowaniem
import Dashboard from './pages/Dashboard'; //strona po zalogowaniu (wczesniej App.jsx)
import New_experiment from './pages/New_experiment'; //dodawanie nowego eksperymentu
import Experiment_details from './pages/Experiment_details'; //szczegoly eksperymentu

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new-experiment" element={<New_experiment />} />
        <Route path="/experiment/:id" element={<Experiment_details />} />
      </Routes>
    </Router>
  );
}

export default App;