"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  Heart,
  MessageCircle,
} from "lucide-react";
import type { CSSProperties } from "react";
import Hero from "./hero";
import GlassyCarousel, {
  type GlassyCarouselItem,
} from "./ui/glassy-coverflow-carousel";
import {
  Header,
  Footer,
  DemoNotice,
  VehicleCard,
  VehicleDetails,
  FilterBar,
  emptyFilters,
  filterVehicles,
} from "./shared";
import { useVehicles } from "@/lib/store";
import {
  Vehicle,
  isSampleVehicle,
  money,
  publicVehicleDescription,
  whatsapp,
} from "@/lib/data";
import { isDemo } from "@/lib/supabase";
export default function Website({ shop = false }: { shop?: boolean }) {
  const { vehicles, loading, error, refresh } = useVehicles();
  const [filters, setFilters] = useState(emptyFilters),
    [selected, setSelected] = useState<Vehicle | null>(null),
    [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem("cs-favorites") || "[]"));
    } catch {}
  }, []);
  function favorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("cs-favorites", JSON.stringify(next));
  }
  const list = filterVehicles(vehicles, filters, favorites);
  const hasSampleListings = isDemo || vehicles.some(isSampleVehicle);
  const carouselVehicles = [...vehicles]
    .filter((vehicle) => vehicle.status === "available")
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.year - a.year)
    .slice(0, 30);
  const carouselItems: (GlassyCarouselItem & { vehicle: Vehicle })[] =
    carouselVehicles.map((vehicle) => ({
      id: vehicle.id,
      vehicle,
      title: `${vehicle.brand} ${vehicle.model}`,
      brand: vehicle.brand,
      subtitle: `${vehicle.year} · ${vehicle.city}, ${vehicle.state} · ${money(vehicle.price)}`,
      year: String(vehicle.year),
      location: `${vehicle.city}, ${vehicle.state}`,
      price: money(vehicle.price),
      image: vehicle.images[0] || "/cars/hatch.webp",
      accent: vehicle.featured ? "#ff744b" : "#7f91aa",
      description: publicVehicleDescription(vehicle.description),
    }));
  const visible = list;
  return (
    <>
      <Header />
      <main className={`site-page ${shop ? "shop-page" : "home-page"}`}>
        {!shop ? (
          <Hero />
        ) : (
          <section className="shop-intro">
            <div className="breadcrumbs">
              <Link href="/">Início</Link>
              <span>/</span>Loja
            </div>
            <p className="eyebrow">ENCONTRE O SEU PRÓXIMO CAPÍTULO</p>
            <h1>
              Seu próximo carro
              <br />
              está <em>por aqui.</em>
            </h1>
            <p>Explore os veículos da nossa rede. A gente faz a conexão.</p>
            <div className="shop-decoration" aria-hidden="true">
              CS<span> /</span>
            </div>
          </section>
        )}
        {shop ? (
          <section className="inventory section" id="selecao">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {shop
                    ? "O CARRO CERTO, DO SEU JEITO"
                    : "01 / ENCONTRE SUA PRÓXIMA DIREÇÃO"}
                </p>
                <h2>
                  {shop ? (
                    "Explore a loja."
                  ) : (
                    <>
                      Escolhas que <em>movem.</em>
                    </>
                  )}
                </h2>
              </div>
              {!shop && (
                <Link className="text-link" href="/loja">
                  Ver todos os veículos <ArrowUpRight size={20} />
                </Link>
              )}
            </div>
            <FilterBar
              vehicles={vehicles}
              value={filters}
              onChange={setFilters}
            />
            <div className="catalog-toolbar">
              <div className="body-tabs">
                {["", "Hatch", "Sedã", "SUV", "Picape"].map((b) => (
                  <button
                    key={b}
                    className={filters.body === b ? "selected" : ""}
                    onClick={() => setFilters({ ...filters, body: b })}
                  >
                    {b || "Todos"}
                  </button>
                ))}
              </div>
              <button
                className={
                  "saved-filter " + (filters.favorites ? "selected" : "")
                }
                onClick={() =>
                  setFilters({ ...filters, favorites: !filters.favorites })
                }
              >
                <Heart size={15} /> Favoritos ({favorites.length})
              </button>
            </div>
            <div className="result-heading">
              <span>
                {loading
                  ? "Carregando veículos…"
                  : `${list.length} veículos encontrados`}
              </span>
              <label>
                Ordenar por{" "}
                <select
                  aria-label="Ordenar veículos"
                  value={filters.sort}
                  onChange={(e) =>
                    setFilters({ ...filters, sort: e.target.value })
                  }
                >
                  <option value="featured">Destaques</option>
                  <option value="price-up">Menor preço</option>
                  <option value="price-down">Maior preço</option>
                  <option value="newest">Mais novos</option>
                </select>
              </label>
            </div>
            <DemoNotice show={hasSampleListings} />
            {error ? (
              <div className="empty">
                <p>{error}</p>
                <button onClick={refresh} className="btn dark">
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="car-grid">
                {visible.map((v) => (
                  <VehicleCard
                    key={v.id}
                    v={v}
                    onOpen={() => setSelected(v)}
                    favorite={favorites.includes(v.id)}
                    onFavorite={() => favorite(v.id)}
                  />
                ))}
              </div>
            )}
            {!loading && !error && !list.length && (
              <div className="empty">
                <Search size={36} />
                <h3>Nenhum carro por aqui. Ainda.</h3>
                <p>
                  Experimente outros filtros ou conte para a CS Car o que você
                  procura.
                </p>
                <button
                  className="btn dark"
                  onClick={() => setFilters(emptyFilters)}
                >
                  Limpar filtros
                </button>
              </div>
            )}
            {!shop && (
              <Link href="/loja" className="btn outline browse-all">
                Explore todos os veículos <ArrowRight size={18} />
              </Link>
            )}
          </section>
        ) : (
          <section
            className="showcase-section section home-carousel-section"
            id="selecao"
          >
            <CarouselVideoBackground />
            <div className="section-heading">
              <div>
                <p className="eyebrow">01 / ESCOLHA SUA PRÓXIMA DIREÇÃO</p>
                <h2>
                  Encontre seu <em>próximo carro.</em>
                </h2>
                <p className="carousel-intro-copy">
                  Explore até 30 veículos da rede. Selecione um carro para ver
                  os detalhes.
                </p>
              </div>
              <Link className="text-link" href="/loja">
                Abrir filtros da loja <ArrowUpRight size={20} />
              </Link>
            </div>
            <DemoNotice show={hasSampleListings} />
            {loading ? (
              <div className="home-carousel-status" role="status">
                Buscando veículos da rede…
              </div>
            ) : error ? (
              <div className="home-carousel-status" role="alert">
                <p>{error}</p>
                <button className="btn outline" onClick={refresh}>
                  Tentar novamente
                </button>
              </div>
            ) : carouselItems.length ? (
              <GlassyCarousel
                items={carouselItems}
                initialIndex={0}
                layout="website"
                cardOrientation="portrait"
                compactControls
                label="Seleção de veículos CS Car"
                className="cs-car-catalog dark"
                onItemOpen={(item) =>
                  setSelected(
                    carouselVehicles.find(
                      (vehicle) => vehicle.id === item.id,
                    ) ?? null,
                  )
                }
                style={
                  {
                    "--carousel-background": "#0b0d11",
                    "--color-background": "#0b0d11",
                    "--color-foreground": "#f1f3f8",
                    "--color-card": "#181d27",
                    "--color-card-foreground": "#f1f3f8",
                    "--color-muted-foreground": "#a6adbd",
                    "--color-border": "#ffffff27",
                    "--color-primary": "#ff744b",
                    "--color-primary-foreground": "#ffffff",
                    "--carousel-shadow-color": "#000000",
                    "--carousel-font-body": "Rajdhani, DM Sans, sans-serif",
                    "--carousel-font-display": "Rajdhani, DM Sans, sans-serif",
                  } as CSSProperties
                }
              />
            ) : (
              <div className="home-carousel-status" role="status">
                Novos carros chegando em breve.
              </div>
            )}
          </section>
        )}
        {shop && (
          <section className="contact-strip">
            <p>Não encontrou o carro que imaginou?</p>
            <a
              href={whatsapp("Olá, CS Car! Estou procurando um carro.")}
              target="_blank"
              rel="noreferrer"
            >
              Vamos encontrar juntos <MessageCircle size={20} />
            </a>
          </section>
        )}
      </main>
      <Footer />
      {selected && (
        <VehicleDetails v={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function CarouselVideoBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const video = container?.querySelector("video");
    const source = video?.querySelector("source");
    if (!container || !video || !source) return;
    const activeVideo = video as HTMLVideoElement;
    const activeSource = source as HTMLSourceElement;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileLayout = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    let isVisible = false;

    function syncPlayback() {
      if (mobileLayout.matches || reducedMotion.matches || !isVisible) {
        activeVideo.pause();
        return;
      }

      if (activeSource.dataset.loaded !== "true") {
        activeSource.src = activeSource.dataset.src || "";
        activeSource.dataset.loaded = "true";
        activeVideo.load();
      }
      void activeVideo.play().catch(() => {});
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        syncPlayback();
      },
      { rootMargin: "220px 0px" },
    );

    observer.observe(container);
    reducedMotion.addEventListener("change", syncPlayback);
    mobileLayout.addEventListener("change", syncPlayback);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", syncPlayback);
      mobileLayout.removeEventListener("change", syncPlayback);
      activeVideo.pause();
    };
  }, []);

  return (
    <div className="home-carousel-video" ref={containerRef} aria-hidden="true">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster="/videos/cs-car-carousel-poster.webp"
      >
        <source
          data-src="/videos/cs-car-carousel-background.mp4"
          type="video/mp4"
        />
      </video>
    </div>
  );
}
