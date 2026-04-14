import React from 'react';
import { useNavigate } from 'react-router-dom';

import arrow from './images/arrow.png';
import back_img from './images/back.jpg';

function Start() {
  const navigate = useNavigate();
  const [hoverSignIn, setHoverSignIn] = React.useState(false);
  const [hoverSignUp, setHoverSignUp] = React.useState(false);

  return (
    <>
        {/* część na tle zdjęcia roślin */}
        <div
          style={{
              position: 'relative',
              width: '100%',
              height: '100vh',
              overflow: 'hidden',
              backgroundImage: `url(${back_img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
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

              onClick={() => {
                  document.getElementById('about us')?.scrollIntoView({ behavior: 'smooth' });
                }}
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


        {/* część na białym tle o nas */}
        <div
          id="about us"
          style={{
            width: '100%',
            height: '75vh',
            backgroundColor: 'white',
            display: 'flex',
          }}
        >
        
        {/* napis */}
          <h1
            style={{
              position: 'relative',
              top: '40%',
              left: '10%',
              fontSize: '60px',
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              color: 'black',
              maxWidth: '20%',
            }}
          >
            Our system’s features
          </h1>
          
          {/* o nas, o systemie */}
          <div
              style={{
                width: '60%',
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                paddingTop: '5%',
                paddingRight: '10%',
                paddingLeft: '15%',
              }}
            >
              <p
                style={{
                  fontSize: '30px',
                  fontFamily: 'Inter, sans-serif',
                  color: 'black',
                  lineHeight: '1.6',
                }}
              >
                <strong> Kiedyś napiszemy coś o nas i o systemie, a na razie placeholder. </strong>

                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ullamcorper consectetur elit, vel dapibus augue consequat id. Aenean posuere ante consectetur bibendum blandit. Donec erat urna, volutpat in scelerisque eu, ultricies at ligula. Fusce faucibus dui eu lorem bibendum volutpat. Nulla facilisi. Aliquam volutpat purus nec mi mollis, in ultricies dui auctor. Quisque id aliquet lorem.

                Vivamus condimentum accumsan est eget blandit. Proin laoreet dui ac dignissim porttitor. Ut mattis et velit sed rutrum. Etiam auctor odio ac scelerisque iaculis. Nullam sed lectus et augue mollis consequat. In ullamcorper a quam nec aliquam. Aenean eget velit in diam euismod pretium. Sed ac diam eu odio tincidunt faucibus. Aliquam sit amet ultricies purus. Etiam malesuada orci quis neque accumsan, at rutrum ligula vestibulum. Nulla vel massa varius, tincidunt justo sed, interdum metus. Curabitur vel luctus mi.

              </p>
            </div>
        </div>
    </>
  );
}

export default Start;