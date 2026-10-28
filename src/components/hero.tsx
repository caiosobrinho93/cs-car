"use client";
import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
// Six virtual copies of frame 100 extend the scroll without extra image files.
const FINAL_HOLD_FRAMES = 6;
const FRAME_TRANSITIONS = 99;
export default function Hero() {
  const host = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = host.current!,
      c = canvas.current!,
      ctx = c.getContext("2d", { alpha: false });
    if (!ctx) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let disposed = false,
      target = 0,
      active = 0,
      last = -1,
      queue: number[] = [],
      cleanup = () => {};
    const cache = new Map<number, HTMLImageElement>(),
      pending = new Set<number>(),
      failed = new Set<number>();
    const mobile = innerWidth < 760,
      limit = mobile ? 20 : 30;
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
      while (active < 4 && queue.length && !disposed) {
        const n = queue.shift()!;
        if (cache.has(n) || pending.has(n) || failed.has(n)) continue;
        active++;
        pending.add(n);
        const img = new Image();
        img.decoding = "async";
        const finish = () => {
          active--;
          pending.delete(n);
          pump();
        };
        img.onload = () => {
          if (!disposed) {
            cache.set(n, img);
            if (cache.size > limit) {
              const far = [...cache.keys()].sort(
                (a, b) => Math.abs(b - target) - Math.abs(a - target),
              )[0];
              cache.delete(far);
            }
            paint();
          }
          finish();
        };
        img.onerror = () => {
          failed.add(n);
          finish();
        };
        img.src = `/sequence/${mobile ? "mobile" : "desktop"}/${String(n + 1).padStart(3, "0")}.webp`;
      }
    }
    function seek(p: number) {
      const intro = el.querySelector<HTMLElement>(".hero-copy"),
        outro = el.querySelector<HTMLElement>(".hero-outro");
      if (intro) intro.inert = p > 0.25;
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
    const resize = () => {
      c.width = Math.round(c.clientWidth * Math.min(devicePixelRatio, 1.5));
      c.height = Math.round(c.clientHeight * Math.min(devicePixelRatio, 1.5));
      last = -1;
      paint();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    resize();
    seek(0);
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (disposed) return;
        gsap.registerPlugin(ScrollTrigger);
        const state = { p: 0 };
        const tween = gsap.to(state, {
          p: 1,
          ease: "none",
          onUpdate: () =>
            seek(
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
        ScrollTrigger.refresh();
      },
    );
    return () => {
      disposed = true;
      ro.disconnect();
      cleanup();
      cache.clear();
    };
  }, []);
  return (
    <section ref={host} className="hero" data-frame="1">
      <div className="hero-stage">
        <img
          className="hero-poster"
          src="/sequence/desktop/001.webp"
          alt="Carro esportivo em uma garagem iluminada"
          fetchPriority="high"
        />
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
        <div className="scroll-progress" />
      </div>
    </section>
  );
}
