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
      <div className="start-hero" style={{ '--start-background': `url(${back_img})` }}>
        {/* nakładka przyciemniająca */}
        <div className="start-hero-overlay" />

        {/* header z logo */}
        <header className="start-header">
          <div className="start-brand">
            <img src={logo} alt="PlantStalker logo" className="start-brand-logo" />
            <img src={name} alt="PlantStalker" className="start-brand-name" />
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
        </header>

        {/* środkowy blok: tytuł + przyciski */}
        <main className="start-hero-content">
          <h1 className="start-title">
            <span style={{ display: 'block' }}>{t("start.titleLine1")}</span>
            <span className="start-title-second-line">{t("start.titleLine2")}</span>
          </h1>

          <div className="start-auth-actions">
            <button
              className="start-auth-button"
              style={{
                backgroundColor: hoverSignIn ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
              }}
              onMouseEnter={() => setHoverSignIn(true)}
              onMouseLeave={() => setHoverSignIn(false)}
              onClick={() => setShowLogin(true)}
            >
              {t("start.signIn")}
            </button>

            <button
              className="start-auth-button"
              style={{
                backgroundColor: hoverSignUp ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
              }}
              onMouseEnter={() => setHoverSignUp(true)}
              onMouseLeave={() => setHoverSignUp(false)}
              onClick={() => setShowRegister(true)}
            >
              {t("start.signUp")}
            </button>
          </div>

          <p className="start-copyright">
            {t("start.copyright")}
          </p>
        </main>

        {/* MORE + strzałka na dole */}
        <div
          className="start-more"
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
          onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span>{t("start.more")}</span>
          <img src={arrow} alt={t("start.scrollDown")} />
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
