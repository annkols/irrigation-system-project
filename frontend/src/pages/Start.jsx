import React from 'react';
import { useNavigate } from 'react-router-dom';

import arrow from './images/arrow.png';
import back_img from './images/back.jpg';
import logo from './images/logo_cultiva.svg';

function Start() {
  const navigate = useNavigate();
  const [hoverSignIn, setHoverSignIn] = React.useState(false);
  const [hoverSignUp, setHoverSignUp] = React.useState(false);

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
          <img src={logo} alt="Cultiva logo" style={{ height: '40px', width: 'auto' }} />
          <span style={{
            fontSize: '22px',
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif',
            color: 'white',
            letterSpacing: '1px',
          }}>CULTIVA</span>
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
            Intelligent management of greenhouse experiments
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
              onClick={() => navigate('/dashboard')}
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
            © Katedra Agronomii · Uniwersytet Przyrodniczy w Poznaniu
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
          Our system features
        </h2>

        <p style={{
          fontSize: '18px',
          fontFamily: 'Inter, sans-serif',
          color: '#444',
          lineHeight: '1.7',
          margin: 0,
        }}>
          <strong>Tutaj napiszemy o systemie — na razie placeholder.</strong>
          {' '}Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ullamcorper consectetur elit, vel dapibus augue consequat id. Aenean posuere ante consectetur bibendum blandit. Donec erat urna, volutpat in scelerisque eu, ultricies at ligula. Fusce faucibus dui eu lorem bibendum volutpat. Nulla facilisi. Aliquam volutpat purus nec mi mollis, in ultricies dui auctor. Quisque id aliquet lorem.
        </p>
      </div>
    </>
  );
}

export default Start;
