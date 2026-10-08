import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import arrow from './images/arrow.png';
import back_img from './images/back.jpg';
import logo from './images/logo-white.png';
import name from './images/name-white.png';
import Register from './Register';
import Login from "./Login";

function Start() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [hoverSignIn, setHoverSignIn] = React.useState(false);
  const [hoverSignUp, setHoverSignUp] = React.useState(false);

  const [showLogin, setShowLogin] = React.useState(Boolean(location.state?.showLogin));
  const [showRegister, setShowRegister] = React.useState(false);

  React.useEffect(() => {
    if (location.state?.showLogin) {
      toast.info(t("start.sessionExpired"));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate, t]);

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
          <div className="start-brand">
            <img src={logo} alt="PlantStalker logo" style={{ height: '64px', width: 'auto' }} />
            <img src={name} alt="PlantStalker" style={{ height: '32px', width: 'auto' }} />
          </div>
          <div className="start-language-switcher" aria-label={t("topbar.languageSelection")}>
            <button
              type="button"
              className={`lang-btn start-lang-btn ${i18n.resolvedLanguage === "en" ? "active" : ""}`}
              title={t("topbar.english")}
              aria-label={t("topbar.english")}
              aria-pressed={i18n.resolvedLanguage === "en"}
              onClick={() => i18n.changeLanguage("en")}
            >
              <img src="https://flagcdn.com/w40/gb.png" alt={t("topbar.englishFlag")} className="flag-icon" />
            </button>
            <button
              type="button"
              className={`lang-btn start-lang-btn ${i18n.resolvedLanguage === "pl" ? "active" : ""}`}
              title={t("topbar.polish")}
              aria-label={t("topbar.polish")}
              aria-pressed={i18n.resolvedLanguage === "pl"}
              onClick={() => i18n.changeLanguage("pl")}
            >
              <img src="https://flagcdn.com/w40/pl.png" alt={t("topbar.polishFlag")} className="flag-icon" />
            </button>
          </div>
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
            maxWidth: '760px',
            margin: 0,
            lineHeight: 1.2,
          }}>
            <span style={{ display: 'block' }}>{t("start.titleLine1")}</span>
            <span className="start-title-second-line">{t("start.titleLine2")}</span>
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
              {t("start.signIn")}
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
              {t("start.signUp")}
            </button>
          </div>

          <p style={{
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif',
            color: 'rgba(255,255,255,0.7)',
            margin: 0,
          }}>
            {t("start.copyright")}
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
          }}>{t("start.more")}</span>
          <img src={arrow} alt={t("start.scrollDown")} style={{ width: '32px', height: 'auto', marginTop: '6px' }} />
        </div>
      </div>

      {/* sekcja o nas */}
      <div
        id="about"
        className="start-about-section"
      >
        <div className="start-about-heading">
          <h2>{t("start.aboutTitle")}</h2>
        </div>

        <div className="start-about-content">
          <p className="start-about-description">
            {t("start.aboutTextLine1")}{" "}{t("start.aboutTextLine2")}
          </p>
          <div className="start-contact">
            <a className="start-contact-action" href="mailto:anna.kolanos@up.poznan.pl">
              <span className="material-symbols-outlined" aria-hidden="true">mail</span>
              <span>{t("start.contactTitle")}</span>
            </a>
          </div>
        </div>
      </div>
      {showLogin && (<Login onClose={() => setShowLogin(false)} />)}
      {showRegister && ( <Register onClose={() => setShowRegister(false)}/>)}
    </>
  );
}

export default Start;
