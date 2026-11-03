"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

const INTRO_LOADER_DURATION = 2000;
const INTRO_LOGO_FADE_IN = 600;
const INTRO_LOGO_HOLD = 2100;
const INTRO_LOGO_FADE_OUT = 500;
const INTRO_BLACK_HOLD = 300;
const INTRO_SCREEN_FADE_OUT = 500;

export default function Hero() {
  const host = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [introMounted, setIntroMounted] = useState(true);
  const [introVisible, setIntroVisible] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const el = host.current;
    const currentVideo = videoRef.current;
    if (!el || !currentVideo) return;
    const video: HTMLVideoElement = currentVideo;

    let disposed = false;
    let introRemoved = false;
    let introExitTimer: number | undefined;
    let introTimelineTimer: number | undefined;
    let introHardStopTimer: number | undefined;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    let isVisible = false;

    function playVideo() {
      if (disposed || reducedMotion || !isVisible) return;
      if (!video.src) {
        video.src = "/videos/cs-car-carousel-background.mp4";
        video.load();
      }
      void video.play().catch(() => setVideoReady(false));
    }

    function finishIntro() {
      if (disposed || introRemoved) return;
      introRemoved = true;
      setIntroMounted(false);
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    }

    const introBeforeScreenFade =
      INTRO_LOADER_DURATION +
      INTRO_LOGO_FADE_IN +
      INTRO_LOGO_HOLD +
      INTRO_LOGO_FADE_OUT +
      INTRO_BLACK_HOLD;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    introTimelineTimer = window.setTimeout(() => {
      if (disposed || introRemoved) return;
      setIntroVisible(false);
      introExitTimer = window.setTimeout(finishIntro, reducedMotion ? 20 : INTRO_SCREEN_FADE_OUT);
    }, reducedMotion ? 20 : introBeforeScreenFade);
    // Failsafe if the browser suspends animation timers while the tab is idle.
    introHardStopTimer = window.setTimeout(
      finishIntro,
      introBeforeScreenFade + INTRO_SCREEN_FADE_OUT + 1000,
    );

    const onPlaying = () => setVideoReady(true);
    const onError = () => setVideoReady(false);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);

    const visibility = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) playVideo();
      else video.pause();
    }, { threshold: 0.01 });
    visibility.observe(el);

    return () => {
      disposed = true;
      visibility.disconnect();
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
      video.pause();
      window.clearTimeout(introTimelineTimer);
      window.clearTimeout(introExitTimer);
      window.clearTimeout(introHardStopTimer);
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);

  return (
    <section ref={host} className="hero">
      <div className="hero-stage">
        <picture className="hero-poster-frame">
          <img
            className="hero-poster"
            src="/videos/cs-car-carousel-poster.webp"
            alt=""
            fetchPriority="high"
            aria-hidden="true"
          />
        </picture>
        <video
          ref={videoRef}
          className={`hero-video${videoReady ? " is-ready" : ""}`}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <h1>
            <span>ENCONTRE O VEÍCULO</span>
            <em>CERTO</em>
          </h1>
          <p>Uma seleção feita para encontrar seu próximo caminho.</p>
          <a className="btn fire-cta" href="#selecao">
            Explorar veículos <ArrowDown size={18} aria-hidden="true" />
          </a>
        </div>
      </div>
      {introMounted && (
        <div
          className={`site-intro${introVisible ? " is-active" : " is-exiting"}`}
          role="status"
          aria-label="CS Car"
        >
          <span className="site-intro-loader" aria-hidden="true" />
          <div className="site-intro-runner">
            <img
              className="site-intro-logo"
              src="/brand/cs-car-logo.png"
              alt="CS Car"
              fetchPriority="high"
            />
          </div>
        </div>
      )}
    </section>
  );
}
