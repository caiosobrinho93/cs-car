"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Menu,
  X,
  Heart,
  MapPin,
  Gauge,
  Settings2,
  Search,
  SlidersHorizontal,
  ArrowRight,
  Check,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Vehicle, money, normalize, whatsapp } from "@/lib/data";
import { isDemo } from "@/lib/supabase";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="CS Car, início">
      <img className="brand-logo" src="/brand/cs-car-logo.png" alt="CS Car" />
    </Link>
  );
}
export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <header className={`header ${scrolled ? "scrolled" : "transparent"}`}>
      <Brand />
      {open && (
        <button
          className="nav-backdrop"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}
      <nav className={open ? "nav open" : "nav"}>
        <Link href="/loja" onClick={() => setOpen(false)}>
          Encontre seu carro
        </Link>
        <Link href="/#vender" onClick={() => setOpen(false)}>
          Venda com a CS
        </Link>
        <Link href="/#conexao" onClick={() => setOpen(false)}>
          Como funciona
        </Link>
        <Link
          className="nav-partner"
          href="/rede"
          onClick={() => setOpen(false)}
        >
          Área do parceiro <ArrowUpRight size={15} />
        </Link>
      </nav>
      <button
        className="menu-btn icon-btn"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-main">
        <Brand />
        <p>
          O próximo capítulo da sua história
          <br />
          pode começar com uma conexão.
        </p>
        <a
          href={whatsapp("Olá! Quero falar com a CS Car.")}
          target="_blank"
          rel="noreferrer"
        >
          (17) 99744-8213 <ArrowUpRight size={18} />
        </a>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} CS Car. Conexões que movem.</span>
        <Link href="/rede">Rede de parceiros</Link>
        <span>Feito para seguir em frente.</span>
      </div>
    </footer>
  );
}
export function DemoNotice() {
  return isDemo ? (
    <div className="demo-notice">
      <span className="demo-pill">DEMONSTRAÇÃO</span> Veículos, preços e
      garagens fictícios. Fotos ilustrativas.
    </div>
  ) : null;
}
export function Modal({
  children,
  title,
  onClose,
  wide = false,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Fechar">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function VehicleCard({
  v,
  onOpen,
  favorite = false,
  onFavorite,
  network = false,
  onRefer,
}: {
  v: Vehicle;
  onOpen: () => void;
  favorite?: boolean;
  onFavorite?: () => void;
  network?: boolean;
  onRefer?: () => void;
}) {
  function tilt(event: React.PointerEvent<HTMLElement>) {
    if (
      event.pointerType !== "mouse" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(1, (event.clientX - bounds.left) / bounds.width),
    );
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - bounds.top) / bounds.height),
    );
    card.style.setProperty("--rx", `${(0.5 - y) * 7}deg`);
    card.style.setProperty("--ry", `${(x - 0.5) * 9}deg`);
    card.style.setProperty("--shine-x", `${x * 100}%`);
    card.style.setProperty("--shine-y", `${y * 100}%`);
  }
  function resetTilt(event: React.PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty("--rx", "0deg");
    event.currentTarget.style.setProperty("--ry", "0deg");
  }
  return (
    <article
      className="car-card"
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
    >
      <div className="car-photo">
        <button
          onClick={onOpen}
          className="image-button"
          aria-label={`Ver ${v.brand} ${v.model}`}
        >
          <img
            src={v.images[0] || "/cars/hatch.webp"}
            alt={`${v.brand} ${v.model}${isDemo ? " — foto ilustrativa" : ""}`}
            loading="lazy"
          />
        </button>
        <span className="car-badge">
          {v.status === "reserved"
            ? "RESERVADO"
            : v.featured
              ? "EM DESTAQUE"
              : v.body.toUpperCase()}
        </span>
        {onFavorite && (
          <button
            className={"favorite " + (favorite ? "active" : "")}
            aria-label={`${favorite ? "Remover" : "Salvar"} ${v.model} nos favoritos`}
            aria-pressed={favorite}
            onClick={onFavorite}
          >
            <Heart size={17} fill={favorite ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      <div className="car-info">
        <div className="car-title">
          <button onClick={onOpen}>
            <span>{v.brand}</span>
            <h3>{v.model}</h3>
          </button>
          <span className="car-year">{v.year}</span>
        </div>
        <p className="car-version">{v.version}</p>
        <div className="car-specs">
          <span>
            <Gauge size={14} />
            {v.mileage.toLocaleString("pt-BR")} km
          </span>
          <span>
            <Settings2 size={14} />
            {v.transmission}
          </span>
          <span>{v.fuel}</span>
        </div>
        <div className="car-price">
          <strong>{money(v.price)}</strong>
          <button
            onClick={onOpen}
            className="round-arrow"
            aria-label={`Detalhes de ${v.model}`}
          >
            <ArrowUpRight size={20} />
          </button>
        </div>
        <p className="car-location">
          <MapPin size={13} />
          {v.city}, {v.state}
        </p>
        {network && (
          <div className="network-terms">
            <p>
              <span>Sua comissão</span>
              <strong>{money(v.partner_fee || 0)}</strong>
            </p>
            <small>
              CS Car: {money(v.platform_fee || 0)} · já incluídos no preço
            </small>
            <span className="garage-name">{v.garage_name}</span>
            {onRefer && (
              <button onClick={onRefer} className="btn dark small">
                Tenho um comprador <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
export type Filters = {
  query: string;
  brand: string;
  body: string;
  max: string;
  minYear: string;
  gear: string;
  city: string;
  fuel: string;
  commission: string;
  sort: string;
  favorites: boolean;
};
export const emptyFilters: Filters = {
  query: "",
  brand: "",
  body: "",
  max: "",
  minYear: "",
  gear: "",
  city: "",
  fuel: "",
  commission: "",
  sort: "featured",
  favorites: false,
};
export function filterVehicles(
  vehicles: Vehicle[],
  f: Filters,
  saved: string[] = [],
) {
  return vehicles
    .filter(
      (v) =>
        (v.status === "available" || v.status === "reserved") &&
        normalize(`${v.brand} ${v.model} ${v.version}`).includes(
          normalize(f.query),
        ) &&
        (!f.brand || v.brand === f.brand) &&
        (!f.body || v.body === f.body) &&
        (!f.max || v.price <= Number(f.max)) &&
        (!f.minYear || v.year >= Number(f.minYear)) &&
        (!f.gear || v.transmission === f.gear) &&
        (!f.city || v.city === f.city) &&
        (!f.fuel || v.fuel === f.fuel) &&
        (!f.commission || (v.partner_fee || 0) >= Number(f.commission)) &&
        (!f.favorites || saved.includes(v.id)),
    )
    .sort((a, b) =>
      f.sort === "price-up"
        ? a.price - b.price
        : f.sort === "price-down"
          ? b.price - a.price
          : f.sort === "newest"
            ? b.year - a.year
            : f.sort === "commission"
              ? (b.partner_fee || 0) - (a.partner_fee || 0)
              : Number(b.featured) - Number(a.featured),
    );
}
export function FilterBar({
  vehicles,
  value,
  onChange,
  network = false,
}: {
  vehicles: Vehicle[];
  value: Filters;
  onChange: (f: Filters) => void;
  network?: boolean;
}) {
  const [more, setMore] = useState(false);
  function field(k: keyof Filters, v: string | boolean) {
    onChange({ ...value, [k]: v });
  }
  const options = (k: "brand" | "city" | "fuel") =>
    [...new Set(vehicles.map((v) => v[k]))].sort();
  return (
    <div className="filters">
      <div className="filter-main">
        <label className="search-field">
          <Search size={19} />
          <input
            aria-label="Buscar marca ou modelo"
            placeholder="Qual carro você procura?"
            value={value.query}
            onChange={(e) => field("query", e.target.value)}
          />
        </label>
        <label>
          MARCA
          <select
            value={value.brand}
            onChange={(e) => field("brand", e.target.value)}
          >
            <option value="">Todas as marcas</option>
            {options("brand").map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label>
          SEU ORÇAMENTO
          <select
            value={value.max}
            onChange={(e) => field("max", e.target.value)}
          >
            <option value="">Todos os preços</option>
            {[40000, 60000, 100000, 150000, 250000].map((n) => (
              <option key={n} value={n}>
                Até {money(n)}
              </option>
            ))}
          </select>
        </label>
        <button
          aria-label="Mais filtros"
          className={"filter-toggle " + (more ? "active" : "")}
          onClick={() => setMore(!more)}
          aria-expanded={more}
        >
          <SlidersHorizontal size={18} />
          <span>Mais filtros</span>
        </button>
      </div>
      {more && (
        <div className="filter-more">
          <label>
            ANO A PARTIR DE
            <input
              type="number"
              min="1900"
              max="2200"
              placeholder="Ex.: 2020"
              value={value.minYear}
              onChange={(e) => field("minYear", e.target.value)}
            />
          </label>
          <label>
            CÂMBIO
            <select
              value={value.gear}
              onChange={(e) => field("gear", e.target.value)}
            >
              <option value="">Todos</option>
              <option>Manual</option>
              <option>Automático</option>
            </select>
          </label>
          <label>
            CIDADE
            <select
              value={value.city}
              onChange={(e) => field("city", e.target.value)}
            >
              <option value="">Todas</option>
              {options("city").map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            COMBUSTÍVEL
            <select
              value={value.fuel}
              onChange={(e) => field("fuel", e.target.value)}
            >
              <option value="">Todos</option>
              {options("fuel").map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          {network && (
            <label>
              COMISSÃO MÍNIMA
              <input
                type="number"
                min="0"
                placeholder="R$ 0"
                value={value.commission}
                onChange={(e) => field("commission", e.target.value)}
              />
            </label>
          )}
          <button className="text-btn" onClick={() => onChange(emptyFilters)}>
            Limpar filtros <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
export function VehicleDetails({
  v,
  onClose,
}: {
  v: Vehicle;
  onClose: () => void;
}) {
  const [photo, setPhoto] = useState(0);
  return (
    <Modal title={`${v.brand} ${v.model}`} onClose={onClose} wide>
      <div className="details">
        <div>
          <div className="detail-photo">
            <img
              src={v.images[photo] || "/cars/hatch.webp"}
              alt={`${v.brand} ${v.model} — imagem ${photo + 1}`}
            />
            {v.images.length > 1 && (
              <div className="photo-controls">
                <button
                  aria-label="Foto anterior"
                  onClick={() =>
                    setPhoto((photo - 1 + v.images.length) % v.images.length)
                  }
                >
                  <ChevronLeft />
                </button>
                <span>
                  {photo + 1} / {v.images.length}
                </span>
                <button
                  aria-label="Próxima foto"
                  onClick={() => setPhoto((photo + 1) % v.images.length)}
                >
                  <ChevronRight />
                </button>
              </div>
            )}
          </div>
          <p className="photo-caption">
            {isDemo
              ? "Imagem ilustrativa · anúncio fictício"
              : "Fotos fornecidas pelo anunciante"}
          </p>
          <div className="detail-features">
            {v.features.map((f) => (
              <span key={f}>
                <Check size={15} />
                {f}
              </span>
            ))}
          </div>
        </div>
        <div className="detail-copy">
          <span className="eyebrow">
            {v.year} · {v.body}
          </span>
          <h3>
            {v.brand} {v.model}
          </h3>
          <p>{v.version}</p>
          <strong className="detail-price">{money(v.price)}</strong>
          <div className="detail-specs">
            {[
              ["Quilometragem", `${v.mileage.toLocaleString("pt-BR")} km`],
              ["Câmbio", v.transmission],
              ["Combustível", v.fuel],
              ["Cor", v.color],
              ["Localização", `${v.city}, ${v.state}`],
            ].map(([k, val]) => (
              <p key={k}>
                <span>{k}</span>
                <b>{val}</b>
              </p>
            ))}
          </div>
          <p className="description">{v.description}</p>
          <a
            className="btn orange"
            href={whatsapp(
              `Olá, CS Car! Tenho interesse no ${v.brand} ${v.model} ${v.year}, anunciado por ${money(v.price)}.${isDemo ? " Estou vendo o site de demonstração." : ""}`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} />
            Conversar sobre este carro
          </a>
          <small>Atendimento direto pela CS Car.</small>
        </div>
      </div>
    </Modal>
  );
}
