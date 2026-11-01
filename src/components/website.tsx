"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  Heart,
  CarFront,
  Handshake,
  Network,
  MessageCircle,
} from "lucide-react";
import Hero from "./hero";
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
import { Vehicle, whatsapp } from "@/lib/data";
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
  const newest = [...vehicles]
    .filter((vehicle) => vehicle.status === "available")
    .sort((a, b) => b.year - a.year)
    .slice(0, 8);
  const popular = [...vehicles]
    .filter((vehicle) => vehicle.status === "available")
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)),
    )
    .slice(0, 8);
  const visible = shop ? list : list.slice(0, 8);
  const renderRail = (items: Vehicle[], railName: string) => (
    <div className="vehicle-rail" aria-label={railName}>
      {items.map((v) => (
        <VehicleCard
          key={`${railName}-${v.id}`}
          v={v}
          onOpen={() => setSelected(v)}
          favorite={favorites.includes(v.id)}
          onFavorite={() => favorite(v.id)}
        />
      ))}
      {!items.length && (
        <p className="rail-empty">Novos carros chegando em breve.</p>
      )}
    </div>
  );
  return (
    <>
      <Header />
      <main>
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
        {!shop && (
          <div
            className="manifesto-strip"
            aria-label="Veículos para cada caminho"
          >
            <div className="manifesto-track" aria-hidden="true">
              {[0, 1].map((copy) => (
                <div className="manifesto-group" key={copy}>
                  {[
                    "VEÍCULO",
                    "MOTO",
                    "CARRO NOVO",
                    "SEMINOVO",
                    "SUV",
                    "HATCH",
                    "SEDÃ",
                    "PICAPE",
                    "ESPORTIVO",
                    "ELÉTRICO",
                  ].map((word) => (
                    <span className="manifesto-word" key={word}>
                      {word}
                      <span className="strip-star">✳</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {!shop && (
          <section
            className="street-banner"
            aria-label="A estrada para o seu próximo carro"
          >
            <div className="street-banner-image" />
            <div className="street-banner-copy">
              <p className="eyebrow">CS CAR / A ESTRADA É SUA</p>
              <h2>
                Escolha seu
                <br />
                <em>próximo movimento.</em>
              </h2>
              <p>
                Carros encontrados por conexão, confiança e vontade de seguir em
                frente.
              </p>
            </div>
            <span className="street-mark">
              SHIFT <b>→</b>
            </span>
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
            <DemoNotice />
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
          <>
            <section className="showcase-section section" id="selecao">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">01 / ESCOLHAS DA REDE</p>
                  <h2>
                    Carros em <em>destaque.</em>
                  </h2>
                </div>
                <Link className="text-link" href="/loja">
                  Ver todo o estoque <ArrowUpRight size={20} />
                </Link>
              </div>
              <DemoNotice />
              {renderRail(
                list.filter((v) => v.featured).slice(0, 8).length
                  ? list.filter((v) => v.featured).slice(0, 8)
                  : list.slice(0, 8),
                "Carros em destaque",
              )}
            </section>
            <section className="promo-banner section">
              <div>
                <p className="eyebrow">CS CAR / CONEXÃO SOB MEDIDA</p>
                <h2>
                  O próximo carro
                  <br />
                  <em>está mais perto.</em>
                </h2>
                <p>
                  Encontre opções da nossa rede e converse com a gente para
                  descobrir o carro certo para você.
                </p>
              </div>
              <Link className="btn orange" href="/loja">
                Encontrar meu carro <ArrowUpRight size={18} />
              </Link>
            </section>
            <section className="sell-banner" id="vender">
              <div className="sell-image">
                <img
                  src="/sequence/desktop/075.webp"
                  loading="lazy"
                  alt="Carro esportivo em uma garagem iluminada"
                />
              </div>
              <div className="sell-copy">
                <p className="eyebrow">CS CAR / ANUNCIE COM A GENTE</p>
                <h2>
                  Seu carro.
                  <br />O próximo sonho
                  <br />
                  <em>de alguém.</em>
                </h2>
                <p>
                  Quer vender? A CS Car aproxima seu veículo de quem está
                  procurando. Fale com a gente para anunciar.
                </p>
                <a
                  href={whatsapp("Olá! Quero anunciar meu carro na CS Car.")}
                  target="_blank"
                  rel="noreferrer"
                  className="btn orange"
                >
                  Quero vender meu carro <ArrowUpRight size={18} />
                </a>
              </div>
            </section>
            <section className="showcase-section section newest-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">02 / ACABARAM DE CHEGAR</p>
                  <h2>
                    Recém-<em>chegados.</em>
                  </h2>
                </div>
                <Link className="text-link" href="/loja">
                  Explorar novidades <ArrowUpRight size={20} />
                </Link>
              </div>
              {renderRail(newest, "Veículos recém-chegados")}
            </section>
            <section className="newsletter-section section">
              <div className="newsletter-copy">
                <p className="eyebrow">CS CAR / FIQUE POR DENTRO</p>
                <h2>
                  O próximo capítulo
                  <br />
                  <em>chega no seu e-mail.</em>
                </h2>
                <p>
                  Receba novidades da rede e descubra quando chegar um carro que
                  combina com você.
                </p>
                <Newsletter />
              </div>
              <div className="newsletter-art" aria-hidden="true">
                <img src="/sequence/desktop/042.webp" alt="" loading="lazy" />
                <span>
                  CS<span>/</span>
                </span>
              </div>
            </section>
            <section className="showcase-section section popular-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">03 / ESCOLHAS QUE MOVEM</p>
                  <h2>
                    Os mais <em>procurados.</em>
                  </h2>
                </div>
                <Link className="text-link" href="/loja">
                  Ver todos <ArrowUpRight size={20} />
                </Link>
              </div>
              {renderRail(popular, "Veículos mais procurados")}
            </section>
            <section className="connection section" id="conexao">
              <div className="connection-title">
                <p className="eyebrow">02 / A GENTE CONECTA</p>
                <h2>
                  O carro não precisa
                  <br />
                  estar na nossa garagem.
                  <br />
                  <em>
                    Precisa fazer sentido
                    <br />
                    para você.
                  </em>
                </h2>
              </div>
              <div className="connection-steps">
                {[
                  {
                    n: "01",
                    title: "Você escolhe o caminho.",
                    text: "Explore a loja ou conte qual carro está procurando. Marca, modelo, orçamento: a busca começa com você.",
                    icon: CarFront,
                  },
                  {
                    n: "02",
                    title: "A gente encontra a conexão.",
                    text: "Conectamos você aos veículos de proprietários e garagens da nossa rede, com atendimento próximo.",
                    icon: Network,
                  },
                  {
                    n: "03",
                    title: "Conheça. Negocie. Siga em frente.",
                    text: "Converse com a CS Car, combine uma visita e veja o carro de perto antes de decidir.",
                    icon: Handshake,
                  },
                ].map((s) => (
                  <article key={s.n}>
                    <span className="step-num">{s.n}</span>
                    <div>
                      <s.icon size={23} />
                      <h3>{s.title}</h3>
                      <p>{s.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <section className="partner-banner section">
              <div>
                <p className="eyebrow">CS CAR / REDE DE PARCEIROS</p>
                <h2>
                  Sua garagem tem limites.
                  <br />
                  <em>Suas oportunidades, não.</em>
                </h2>
                <p>
                  Encontre na rede o carro que seu cliente procura.
                  <br />
                  Conecte a venda. Receba a sua comissão.
                </p>
              </div>
              <Link href="/rede" className="btn dark">
                Conheça a rede de parceiros <ArrowUpRight size={19} />
              </Link>
            </section>
          </>
        )}
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
      </main>
      <Footer />
      {selected && (
        <VehicleDetails v={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function Newsletter() {
  const [email, setEmail] = useState(""),
    [submitted, setSubmitted] = useState(false);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  }
  return submitted ? (
    <p className="newsletter-success" role="status">
      Obrigado pelo interesse. A inscrição por e-mail será ativada em breve.
    </p>
  ) : (
    <form className="newsletter-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="newsletter-email">
        Seu e-mail
      </label>
      <input
        id="newsletter-email"
        type="email"
        autoComplete="email"
        placeholder="Seu melhor e-mail"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <button className="btn orange" type="submit">
        Quero receber <ArrowRight size={18} />
      </button>
    </form>
  );
}
