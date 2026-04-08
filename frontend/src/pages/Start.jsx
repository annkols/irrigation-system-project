import React from 'react';
import { useNavigate } from 'react-router-dom';

import arrow from './images/arrow.png';

function Start() {
  const navigate = useNavigate();
  const [hoverSignIn, setHoverSignIn] = React.useState(false);
  const [hoverSignUp, setHoverSignUp] = React.useState(false);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'black',
        overflow: 'hidden',
      }}
    >
      {/* napis */}
      <h1
        style={{
          position: 'absolute',
          top: '25%',
          left: '10%',
          fontSize: '60px',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          color: 'white',
          maxWidth: '30%',
        }}
      >
        Intelligent management of greenhouse experiments
      </h1>

      {/* przycisk sign in */}
        <button
          style={{
            position: 'absolute',
            top: '45%',
            left: '70%',
            width: '15%',
            height: '10%',
            fontSize: '30px',
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            backgroundColor: hoverSignIn
              ? 'rgba(255, 255, 255, 0.4)'
              : 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '2px solid white',
            borderRadius: '50px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={() => setHoverSignIn(true)}
          onMouseLeave={() => setHoverSignIn(false)}
          onClick={() => navigate('/dashboard')}
        >
          Sign in
        </button>

        {/* przycisk sign up */}
        <button
        style={{
          position: 'absolute',
          top: '60%',
          left: '70%',
          width: '15%',
          height: '10%',
          fontSize: '30px',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          backgroundColor: hoverSignUp
            ? 'rgba(0, 191, 99, 0.4)'
            : 'rgba(0, 191, 99, 0.2)',
          color: 'white',
          border: '2px solid #00BF63',
          borderRadius: '50px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={() => setHoverSignUp(true)}
        onMouseLeave={() => setHoverSignUp(false)}
      >
        Sign up
      </button>

      {/* napis MORE i strzałka */ }
      <div
          style={{
            position: 'absolute',
            top: '80%',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}

          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateX(-50%) scale(1)')}
        >
          {/* napis MORE */}
          <h1
            style={{
              fontSize: '40px',
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              color: 'white',
              margin: 0,
              whiteSpace: 'nowrap',
            }}
          >
            MORE
          </h1>

          {/* strzałka pod napisem */}
          <img
            src={arrow}
            alt="strzałka w dół"
            style={{
              marginTop: '10px',
              width: '80px',
              height: 'auto',
            }}
          />
        </div>
    </div>

  );
}

export default Start;