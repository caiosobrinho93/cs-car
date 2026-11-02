"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
// Six virtual copies of frame 100 extend the scroll without extra image files.
const FINAL_HOLD_FRAMES = 6;
const FRAME_TRANSITIONS = 99;
const INTRO_FRAMES = 8;
const INTRO_MIN_DURATION = 1450;
export default function Hero() {
  const host = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const [introMounted, setIntroMounted] = useState(true),
    [introVisible, setIntroVisible] = useState(true);
  useEffect(() => {
    const el = host.current!,
      c = canvas.current!,
      ctx = c.getContext("2d", { alpha: false });
    if (!ctx) {
      setIntroVisible(false);
      setIntroMounted(false);
      return;
    }
    let disposed = false,
      target = 0,
      active = 0,
      last = -1,
      seekFrame = 0,
      queuedProgress = 0,
      queue: number[] = [],
      cleanup = () => {},
      refreshScroll = () => {},
      introFinishScheduled = false,
      introRemoved = false,
      introExitTimer: number | undefined,
      introFinishTimer: number | undefined,
      introSafetyTimer: number | undefined,
      introHardStopTimer: number | undefined;
    const introStarted = performance.now(),
      reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches,
      introMobile = matchMedia("(max-width: 680px)").matches,
      initialFrames = new Set<number>(),
      originalHtmlOverflow = document.documentElement.style.overflow,
      originalBodyOverflow = document.body.style.overflow;
    const copy = el.querySelector<HTMLElement>(".hero-copy"),
      outro = el.querySelector<HTMLElement>(".hero-outro"),
      cache = new Map<number, HTMLImageElement>(),
      pending = new Set<number>(),
      failed = new Set<number>();
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    function finishIntro() {
      if (disposed || introRemoved) return;
      introRemoved = true;
      setIntroMounted(false);
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      requestAnimationFrame(refreshScroll);
    }
    function releaseIntro() {
      if (disposed || introRemoved || introFinishScheduled) return;
      introFinishScheduled = true;
      const minDuration = reducedMotion ? 650 : INTRO_MIN_DURATION;
      const delay = Math.max(
        0,
        minDuration - (performance.now() - introStarted),
      );
      introFinishTimer = window.setTimeout(() => {
        if (disposed || introRemoved) return;
        setIntroVisible(false);
        introExitTimer = window.setTimeout(
          finishIntro,
          reducedMotion ? 20 : introMobile ? 650 : 850,
        );
      }, delay);
    }
    function markInitialFrameReady(n: number) {
      if (n >= INTRO_FRAMES || initialFrames.has(n)) return;
      initialFrames.add(n);
      if (initialFrames.size === INTRO_FRAMES) releaseIntro();
    }
    // Image decoding may stall on slow devices; never let it hold the overlay indefinitely.
    introSafetyTimer = window.setTimeout(releaseIntro, 2600);
    introHardStopTimer = window.setTimeout(finishIntro, 5000);
    const mobile = innerWidth < 760,
      limit = mobile ? 12 : 30;
    function paint() {
      if (disposed || !cache.size) return;
      const n = cache.has(target)
        ? target
        : [...cache.keys()].sort(
            (a, b) => Math.abs(a - target) - Math.abs(b - target),
          )[0];
      if (n === last) return;
      const img = cache.get(n)!;
      const scale = Math.max(c.width / img.width, c.height / img.height);
      const w = img.width * scale,
        h = img.height * scale;
      ctx!.drawImage(img, (c.width - w) * 0.5, (c.height - h) * 0.5, w, h);
      last = n;
      el.dataset.frame = String(n + 1);
      el.dataset.ready = "true";
    }
    function pump() {
      while (
        active <
          (mobile
            ? target < INTRO_FRAMES
              ? 3
              : 2
            : target < INTRO_FRAMES
              ? 6
              : 4) &&
        queue.length &&
        !disposed
      ) {
        const n = queue.shift()!;
        if (cache.has(n) || pending.has(n) || failed.has(n)) continue;
        active++;
        pending.add(n);
        const img = new Image();
        img.decoding = "async";
        img.fetchPriority = n < INTRO_FRAMES ? "high" : "auto";
        const finish = () => {
          active--;
          pending.delete(n);
          pump();
        };
        img.onload = () => {
          void img
            .decode()
            .catch(() => {})
            .then(() => {
              if (!disposed) {
                cache.set(n, img);
                if (cache.size > limit) {
                  const far = [...cache.keys()].sort(
                    (a, b) => Math.abs(b - target) - Math.abs(a - target),
                  )[0];
                  cache.delete(far);
                }
                markInitialFrameReady(n);
                paint();
              }
              finish();
            });
        };
        img.onerror = () => {
          failed.add(n);
          markInitialFrameReady(n);
          finish();
        };
        img.src = `/sequence/${mobile ? "mobile" : "desktop"}/${String(n + 1).padStart(3, "0")}.webp`;
      }
    }
    function seek(p: number) {
      if (copy) copy.inert = p > 0.25;
      if (outro) outro.inert = p < 0.65;
      target = Math.round(p * 99);
      el.dataset.requestedFrame = String(target + 1);
      el.style.setProperty("--progress", String(p));
      el.style.setProperty("--intro", String(Math.max(0, 1 - p * 4)));
      el.style.setProperty("--outro", String(Math.max(0, (p - 0.65) / 0.35)));
      queue = [];
      for (let d = 0; d < 10; d++)
        for (const n of d ? [target + d, target - d] : [target])
          if (n >= 0 && n < 100) queue.push(n);
      paint();
      pump();
    }
    function scheduleSeek(p: number) {
      queuedProgress = p;
      if (seekFrame) return;
      seekFrame = requestAnimationFrame(() => {
        seekFrame = 0;
        seek(queuedProgress);
      });
    }
    const resize = () => {
      const pixelRatio = Math.min(devicePixelRatio, mobile ? 1.15 : 1.5);
      c.width = Math.round(c.clientWidth * pixelRatio);
      c.height = Math.round(c.clientHeight * pixelRatio);
      last = -1;
      paint();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    resize();
    seek(0);
    if (!reducedMotion) {
      Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
        ([{ gsap }, { ScrollTrigger }]) => {
          if (disposed) return;
          gsap.registerPlugin(ScrollTrigger);
          const state = { p: 0 };
          const tween = gsap.to(state, {
            p: 1,
            ease: "none",
            onUpdate: () =>
              scheduleSeek(
                Math.min(
                  1,
                  (state.p * (FRAME_TRANSITIONS + FINAL_HOLD_FRAMES)) /
                    FRAME_TRANSITIONS,
                ),
              ),
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.3,
            },
          });
          cleanup = () => {
            tween.scrollTrigger?.kill();
            tween.kill();
          };
          refreshScroll = () => ScrollTrigger.refresh();
          ScrollTrigger.refresh();
        },
      );
    }
    return () => {
      disposed = true;
      ro.disconnect();
      cleanup();
      if (seekFrame) cancelAnimationFrame(seekFrame);
      cache.clear();
      window.clearTimeout(introFinishTimer);
      window.clearTimeout(introSafetyTimer);
      window.clearTimeout(introExitTimer);
      window.clearTimeout(introHardStopTimer);
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);
  return (
    <section ref={host} className="hero" data-frame="1">
      <div className="hero-stage">
        <picture className="hero-poster-frame">
          <source
            media="(max-width: 759px)"
            srcSet="/sequence/mobile/001.webp"
          />
          <img
            className="hero-poster"
            src="/sequence/desktop/001.webp"
            alt="Carro esportivo em uma garagem iluminada"
            fetchPriority="high"
          />
        </picture>
        <canvas ref={canvas} aria-hidden="true" />
        <div className="hero-shade" />
        <div className="hero-kicker">
          <span className="live-dot" /> CONECTANDO PESSOAS. MOVENDO HISTÓRIAS.
        </div>
        <div className="hero-copy">
          <p className="eyebrow">NÃO É SÓ SOBRE CARROS.</p>
          <h1>
            É sobre o seu
            <br />
            próximo <em>capítulo.</em>
          </h1>
          <p>
            O carro que você procura.
            <br />A conexão que faltava.
          </p>
          <Link className="btn light" href="/loja">
            Encontre seu próximo carro <ArrowUpRight size={19} />
          </Link>
        </div>
        <div className="hero-outro" inert>
          <p className="eyebrow">SEU PRÓXIMO DESTINO COMEÇA AQUI</p>
          <h2>
            Boas conexões.
            <br />
            <em>Novos caminhos.</em>
          </h2>
          <Link href="/loja" className="btn orange">
            Explore a loja <ArrowUpRight size={19} />
          </Link>
        </div>
        <div className="hero-bottom">
          <a href="#selecao">
            <ArrowDown size={16} /> ROLE PARA EXPLORAR
          </a>
        </div>
      </div>
      {introMounted && (
        <div
          className={`site-intro${introVisible ? " is-active" : " is-exiting"}`}
          role="status"
          aria-label="CS Car"
        >
          <div className="site-intro-runner">
            <span className="site-intro-smoke" aria-hidden="true" />
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
