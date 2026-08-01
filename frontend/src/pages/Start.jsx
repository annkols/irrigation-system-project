import React from 'react';
import { useNavigate } from 'react-router-dom';

import arrow from './images/arrow.png';
import back_img from './images/back.jpg';
import logo from './images/logo-white.png';
import name from './images/name-white.png';
import Register from './Register';
import Login from "./Login";

function Start() {
  const navigate = useNavigate();
  const [hoverSignIn, setHoverSignIn] = React.useState(false);
  const [hoverSignUp, setHoverSignUp] = React.useState(false);

  const [showLogin, setShowLogin] = React.useState(false);
  const [showRegister, setShowRegister] = React.useState(false);

  return (
    <>
      {/* hero section */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        backgroundImage: `url(${back_img})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* nakładka przyciemniająca */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
        }} />

        {/* header z logo */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '20px 40px',
        }}>
          <img src={logo} alt="PlantStalker logo" style={{ height: '64px', width: 'auto' }} />
          <img src={name} alt="PlantStalker" style={{ height: '32px', width: 'auto' }} />
        </div>

        {/* środkowy blok: tytuł + przyciski */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          gap: '32px',
          paddingBottom: '80px',
        }}>
          <h1 style={{
            fontSize: '42px',
            fontWeight: 900,
            fontFamily: 'Inter, sans-serif',
            color: 'white',
            maxWidth: '520px',
            margin: 0,
            lineHeight: 1.2,
          }}>
            Greenhouse experiment management system
          </h1>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              style={{
                width: '160px',
                padding: '14px 0',
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                backgroundColor: hoverSignIn ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '50px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={() => setHoverSignIn(true)}
              onMouseLeave={() => setHoverSignIn(false)}
              onClick={() => setShowLogin(true)}
            >
              Sign in
            </button>

            <button
              style={{
                width: '160px',
                padding: '14px 0',
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                backgroundColor: hoverSignUp ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '50px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={() => setHoverSignUp(true)}
              onMouseLeave={() => setHoverSignUp(false)}
              onClick={() => setShowRegister(true)}
            >
              Sign up
            </button>
          </div>

          <p style={{
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif',
            color: 'rgba(255,255,255,0.7)',
            margin: 0,
          }}>
            © Department of Agronomy · Poznań University of Life Sciences
          </p>
        </div>

        {/* MORE + strzałka na dole */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingBottom: '32px',
            cursor: 'pointer',
            opacity: 0.8,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
          onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            color: 'white',
            letterSpacing: '2px',
          }}>MORE</span>
          <img src={arrow} alt="scroll down" style={{ width: '32px', height: 'auto', marginTop: '6px' }} />
        </div>
      </div>

      {/* sekcja o nas */}
      <div
        id="about"
        style={{
          width: '100%',
          minHeight: '75vh',
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          padding: '80px 10%',
          boxSizing: 'border-box',
          gap: '80px',
        }}
      >
        <h2 style={{
          fontSize: '36px',
          fontWeight: 700,
          fontFamily: 'Inter, sans-serif',
          color: 'black',
          minWidth: '220px',
          margin: 0,
          lineHeight: 1.2,
        }}>
          About us
        </h2>

        <p style={{
          fontSize: '18px',
          fontFamily: 'Inter, sans-serif',
          color: '#444',
          lineHeight: '1.7',
          margin: 0,
        }}>
          {' '}PlantStalker is a management system developed to support scientists at the Poznań University of Life Sciences in conducting greenhouse experiments. Our objective is to automate data collection, irrigation and plant monitoring, which enables seamless remote management.
        </p>
      </div>
      {showLogin && (<Login onClose={() => setShowLogin(false)} />)}
      {showRegister && ( <Register onClose={() => setShowRegister(false)}/>)}
    </>
  );
}

export default Start;
