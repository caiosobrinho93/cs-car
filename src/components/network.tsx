"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  LayoutDashboard,
  Network as NetworkIcon,
  CarFront,
  Users,
  Plus,
  Search,
  TrendingUp,
  Wallet,
  LogOut,
  CheckCircle2,
  Pencil,
  ShieldCheck,
  Clock,
  Handshake,
  RefreshCw,
} from "lucide-react";
import {
  Brand,
  Modal,
  VehicleCard,
  VehicleDetails,
  FilterBar,
  emptyFilters,
  filterVehicles,
  DemoNotice,
} from "./shared";
import { useVehicles, readDemo, saveDemo } from "@/lib/store";
import { supabase, isDemo } from "@/lib/supabase";
import {
  Vehicle,
  Garage,
  Referral,
  garages,
  initialReferrals,
  demoVehicles,
  money,
  whatsapp,
} from "@/lib/data";
const statusLabel: Record<string, string> = {
  new: "Nova indicação",
  visit: "Visita agendada",
  sold: "Venda confirmada",
  paid: "Comissão recebida",
  cancelled: "Cancelada",
  available: "Disponível",
  reserved: "Reservado",
  draft: "Rascunho",
  approved: "Aprovado",
  pending: "Aguardando aprovação",
  rejected: "Não aprovado",
};
export default function Network() {
  const [garage, setGarage] = useState<Garage | null>(
      isDemo ? garages[0] : null,
    ),
    [admin, setAdmin] = useState(false),
    [ready, setReady] = useState(isDemo),
    [tab, setTab] = useState("overview"),
    [referrals, setReferrals] = useState<Referral[]>(
      isDemo ? initialReferrals : [],
    ),
    [pending, setPending] = useState<Garage[]>([]),
    [filters, setFilters] = useState(emptyFilters),
    [detail, setDetail] = useState<Vehicle | null>(null),
    [editing, setEditing] = useState<Vehicle | "new" | null>(null),
    [referring, setReferring] = useState<Vehicle | null>(null),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false);
  const { vehicles, loading, error, refresh } = useVehicles(true);
  function notify(message: string) {
    setToast(message);
  }
  async function loadIdentity() {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("garages")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      setGarage(data);
      const { data: isAdmin } = await supabase.rpc("is_admin");
      setAdmin(!!isAdmin);
    } else {
      setGarage(null);
      setAdmin(false);
    }
    setReady(true);
  }
  async function loadReferrals() {
    if (isDemo) {
      try {
        setReferrals(
          JSON.parse(localStorage.getItem("cs-referrals") || "null") ||
            initialReferrals,
        );
      } catch {}
      return;
    }
    const { data, error } = await supabase!
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) notify("Não foi possível carregar as indicações.");
    else setReferrals(data || []);
  }
  async function loadPending() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("garages")
      .select("*")
      .eq("status", "pending");
    if (error) notify("Não foi possível carregar as solicitações.");
    else setPending(data || []);
  }
  useEffect(() => {
    loadIdentity();
    loadReferrals();
    const sub = supabase?.auth.onAuthStateChange(() => {
      setTimeout(() => {
        loadIdentity();
        refresh();
        loadReferrals();
      }, 0);
    });
    return () => sub?.data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (admin) loadPending();
  }, [admin]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 7000);
    return () => clearTimeout(t);
  }, [toast]);
  const own = vehicles.filter((v) => v.garage_id === garage?.id);
  const mine = referrals.filter(
    (r) =>
      r.broker_garage_id === garage?.id ||
      r.owner_garage_id === garage?.id ||
      admin,
  );
  const earnings = mine
    .filter((r) => r.broker_garage_id === garage?.id && r.status === "paid")
    .reduce((s, r) => s + r.partner_fee, 0);
  const pipeline = mine
    .filter(
      (r) =>
        r.broker_garage_id === garage?.id &&
        !["paid", "cancelled"].includes(r.status),
    )
    .reduce((s, r) => s + r.partner_fee, 0);
  async function updateReferral(r: Referral, status: string) {
    setBusy(true);
    try {
      if (isDemo) {
        if (
          status === "sold" &&
          readDemo().find((v) => v.id === r.vehicle_id)?.status === "sold"
        )
          throw new Error("Veículo já vendido.");
        const next = referrals.map((x) =>
          x.id === r.id
            ? { ...x, status }
            : status === "sold" &&
                x.vehicle_id === r.vehicle_id &&
                ["new", "visit"].includes(x.status)
              ? { ...x, status: "cancelled" }
              : x,
        );
        setReferrals(next);
        localStorage.setItem("cs-referrals", JSON.stringify(next));
        if (status === "sold") {
          saveDemo(
            readDemo().map((v) =>
              v.id === r.vehicle_id ? { ...v, status: "sold" } : v,
            ),
          );
        }
      } else {
        const { error } = await supabase!.rpc("transition_referral", {
          referral_id: r.id,
          next_status: status,
        });
        if (error) throw error;
        await loadReferrals();
        await refresh();
      }
      notify("Negociação atualizada.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Não foi possível atualizar.");
    } finally {
      setBusy(false);
    }
  }
  async function platformReceipt(id: string) {
    setBusy(true);
    const { error } = await supabase!.rpc("confirm_platform_receipt", {
      referral_id: id,
    });
    setBusy(false);
    if (error) notify(error.message);
    else {
      notify("Recebimento da CS Car confirmado.");
      loadReferrals();
    }
  }
  async function approve(id: string, status: string) {
    setBusy(true);
    const { error } = await supabase!.rpc("review_garage", {
      target_id: id,
      new_status: status,
    });
    setBusy(false);
    if (error) notify(error.message);
    else {
      notify("Solicitação atualizada.");
      loadPending();
    }
  }
  if (!ready)
    return (
      <div className="auth-page">
        <Brand />
        <p>Verificando seu acesso…</p>
      </div>
    );
  if (!isDemo && !garage && !admin) return <Auth onDone={loadIdentity} />;
  if (!isDemo && garage?.status !== "approved" && !admin)
    return (
      <div className="auth-page">
        <Brand />
        <div className="auth-card">
          <Clock size={40} />
          <h1>
            {garage?.status === "pending"
              ? "Cadastro recebido."
              : "Acesso ainda não liberado."}
          </h1>
          <p>
            A CS Car precisa aprovar sua garagem antes de liberar os veículos e
            as comissões da rede.
          </p>
          <a
            className="btn orange"
            href={whatsapp(
              `Olá! Gostaria de verificar o cadastro da garagem ${garage?.name}.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            Falar com a CS Car
          </a>
          <button className="text-btn" onClick={() => loadIdentity()}>
            Verificar aprovação <RefreshCw size={15} />
          </button>
          <button className="text-btn" onClick={() => supabase!.auth.signOut()}>
            Sair
          </button>
        </div>
      </div>
    );
  const nav: [string, string, typeof LayoutDashboard][] = [
    ["overview", "Visão geral", LayoutDashboard],
    ["network", "Estoque da rede", NetworkIcon],
    ["own", "Meus anúncios", CarFront],
    ["referrals", "Minhas negociações", Handshake],
    ...(admin
      ? [
          ["partners", "Aprovar parceiros", ShieldCheck] as [
            string,
            string,
            typeof LayoutDashboard,
          ],
        ]
      : []),
  ];
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">ESPAÇO DO PARCEIRO</div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={String(id)}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(String(id))}
            >
              <Icon size={19} />
              {String(label)}
              {id === "network" && (
                <span>
                  {vehicles.filter((v) => v.status === "available").length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="network-status">
            <span className="live-dot" />
            Sua próxima venda está na rede.
          </div>
          <Link href="/loja">
            Visitar a loja <ArrowUpRight size={16} />
          </Link>
          {!isDemo && (
            <button onClick={() => supabase!.auth.signOut()}>
              <LogOut size={16} /> Sair da conta
            </button>
          )}
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span>CS CAR / REDE</span>
            <b>{nav.find((n) => n[0] === tab)?.[1]}</b>
          </div>
          <div className="profile">
            <span className="avatar">{garage?.name.slice(0, 1) || "CS"}</span>
            <div>
              <strong>{garage?.name || "CS Car Administração"}</strong>
              <small>Parceiro {isDemo ? "de demonstração" : "aprovado"}</small>
            </div>
          </div>
        </header>
        {isDemo && (
          <div className="dashboard-demo">
            <span>
              <b>AMBIENTE DEMONSTRATIVO</b> · Dados salvos apenas neste
              navegador.
            </span>
            <label>
              Ver como{" "}
              <select
                aria-label="Garagem de demonstração"
                value={garage?.id}
                onChange={(e) => {
                  setGarage(garages.find((g) => g.id === e.target.value)!);
                  setTab("overview");
                }}
              >
                {garages.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="text-btn"
              onClick={() => {
                saveDemo(demoVehicles);
                localStorage.setItem(
                  "cs-referrals",
                  JSON.stringify(initialReferrals),
                );
                setReferrals(initialReferrals);
                setGarage(garages[0]);
                setTab("overview");
                notify("Exemplos restaurados.");
              }}
            >
              Restaurar exemplos
            </button>
          </div>
        )}
        <main className="dashboard-content">
          <div className="dashboard-title">
            <div>
              <p className="eyebrow">BOAS CONEXÕES. NOVOS NEGÓCIOS.</p>
              <h1>
                {tab === "overview" ? (
                  <>
                    Seu próximo negócio
                    <br />
                    começa <em>na rede.</em>
                  </>
                ) : tab === "network" ? (
                  "O carro do seu cliente está aqui."
                ) : tab === "own" ? (
                  "Sua vitrine na rede."
                ) : tab === "partners" ? (
                  "Novos parceiros."
                ) : (
                  "Conexões em movimento."
                )}
              </h1>
              <p>
                {tab === "overview"
                  ? "Explore oportunidades, acompanhe indicações e mova sua garagem."
                  : tab === "network"
                    ? "Preço final com as duas comissões incluídas. Encontre, indique e acompanhe."
                    : tab === "own"
                      ? "Gerencie os veículos e as condições que você oferece aos parceiros."
                      : tab === "partners"
                        ? "Revise as solicitações antes de liberar acesso à rede."
                        : "Cada indicação tem seu preço e suas comissões registrados."}
              </p>
            </div>
            {garage && (
              <button className="btn orange" onClick={() => setEditing("new")}>
                <Plus size={18} />
                Anunciar veículo
              </button>
            )}
          </div>
          {tab === "overview" && (
            <>
              <div className="stats-grid">
                {[
                  {
                    label: "Veículos na rede",
                    value: vehicles.filter((v) => v.status === "available")
                      .length,
                    icon: CarFront,
                    note: "Oportunidades disponíveis",
                  },
                  {
                    label: "Negociações ativas",
                    value: mine.filter(
                      (r) => !["paid", "cancelled"].includes(r.status),
                    ).length,
                    icon: Handshake,
                    note: "Enviadas e recebidas",
                  },
                  {
                    label: "Comissões em andamento",
                    value: money(pipeline),
                    icon: TrendingUp,
                    note: "Indicações que você originou",
                  },
                  {
                    label: "Comissões recebidas",
                    value: money(earnings),
                    icon: Wallet,
                    note: "Confirmadas por você",
                  },
                ].map((s) => (
                  <article className="stat-card" key={s.label}>
                    <div>
                      <span>{s.label}</span>
                      <s.icon size={19} />
                    </div>
                    <strong>{s.value}</strong>
                    <small>{s.note}</small>
                  </article>
                ))}
              </div>
              <div className="network-callout">
                <div>
                  <span className="eyebrow">
                    MAIS ESTOQUE. MAIS POSSIBILIDADES.
                  </span>
                  <h2>
                    Não tem o carro? <em>Tem a conexão.</em>
                  </h2>
                  <p>
                    Encontre o veículo de outro parceiro e apresente ao seu
                    cliente.
                  </p>
                </div>
                <button className="btn light" onClick={() => setTab("network")}>
                  Explorar a rede <ArrowUpRight size={18} />
                </button>
              </div>
              <div className="dashboard-section-title">
                <h2>Oportunidades para conectar</h2>
                <button className="text-btn" onClick={() => setTab("network")}>
                  Ver toda a rede <ArrowRight size={17} />
                </button>
              </div>
              <div className="car-grid">
                {vehicles
                  .filter(
                    (v) =>
                      v.garage_id !== garage?.id && v.status === "available",
                  )
                  .slice(0, 3)
                  .map((v) => (
                    <VehicleCard
                      key={v.id}
                      v={v}
                      network
                      onOpen={() => setDetail(v)}
                      onRefer={garage ? () => setReferring(v) : undefined}
                    />
                  ))}
              </div>
            </>
          )}
          {tab === "network" && (
            <>
              <FilterBar
                vehicles={vehicles}
                value={filters}
                onChange={setFilters}
                network
              />
              <div className="catalog-toolbar">
                <div className="body-tabs">
                  {["", "Hatch", "Sedã", "SUV", "Picape"].map((b) => (
                    <button
                      className={filters.body === b ? "selected" : ""}
                      key={b}
                      onClick={() => setFilters({ ...filters, body: b })}
                    >
                      {b || "Todos"}
                    </button>
                  ))}
                </div>
                <select
                  aria-label="Ordenar rede"
                  value={filters.sort}
                  onChange={(e) =>
                    setFilters({ ...filters, sort: e.target.value })
                  }
                >
                  <option value="featured">Destaques</option>
                  <option value="commission">Maior comissão</option>
                  <option value="price-up">Menor preço</option>
                  <option value="newest">Mais novos</option>
                </select>
              </div>
              <p className="results-count">
                {filterVehicles(vehicles, filters).length} veículos encontrados
              </p>
              <div className="car-grid">
                {filterVehicles(vehicles, filters).map((v) => (
                  <VehicleCard
                    key={v.id}
                    v={v}
                    network
                    onOpen={() => setDetail(v)}
                    onRefer={
                      garage &&
                      v.garage_id !== garage.id &&
                      v.status === "available"
                        ? () => setReferring(v)
                        : undefined
                    }
                  />
                ))}
              </div>
              {!filterVehicles(vehicles, filters).length && (
                <div className="empty">
                  <Search />
                  <h3>Nenhum veículo com esses filtros.</h3>
                  <button
                    className="text-btn"
                    onClick={() => setFilters(emptyFilters)}
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </>
          )}
          {tab === "own" && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Veículo</th>
                    <th>Preço final</th>
                    <th>Comissão parceiro</th>
                    <th>CS Car</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {own.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <div className="table-car">
                          <img src={v.images[0] || "/cars/hatch.webp"} alt="" />
                          <div>
                            <strong>
                              {v.brand} {v.model}
                            </strong>
                            <small>
                              {v.year} · {v.version}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{money(v.price)}</td>
                      <td>{money(v.partner_fee || 0)}</td>
                      <td>{money(v.platform_fee || 0)}</td>
                      <td>
                        <span className={"status " + v.status}>
                          {statusLabel[v.status]}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-btn"
                          onClick={() => setEditing(v)}
                          aria-label={`Editar ${v.model}`}
                        >
                          <Pencil size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!own.length && (
                <div className="empty">
                  <CarFront />
                  <h3>Sua garagem começa com o primeiro anúncio.</h3>
                  <button
                    className="btn orange"
                    onClick={() => setEditing("new")}
                  >
                    Anunciar veículo
                  </button>
                </div>
              )}
            </div>
          )}
          {tab === "referrals" && (
            <>
              <div className="referral-explainer">
                <ShieldCheck size={21} />
                <p>
                  O proprietário confirma a venda. Quem indicou confirma o
                  recebimento da sua comissão. Os pagamentos são combinados
                  entre as partes; o painel registra o andamento.
                </p>
              </div>
              <div className="referral-list">
                {mine.map((r) => {
                  const v = vehicles.find((v) => v.id === r.vehicle_id);
                  const owner = r.owner_garage_id === garage?.id;
                  return (
                    <article className="referral-card" key={r.id}>
                      <div className="referral-card-top">
                        <span className="eyebrow">
                          {owner ? "INDICAÇÃO RECEBIDA" : "VOCÊ INDICOU"} ·{" "}
                          {new Date(r.created_at).toLocaleDateString("pt-BR")}
                        </span>
                        <span className={"status " + r.status}>
                          {statusLabel[r.status]}
                        </span>
                      </div>
                      <h3>
                        {v
                          ? `${v.brand} ${v.model}`
                          : r.vehicle_label || "Veículo"}
                      </h3>
                      <p>
                        Comprador: <strong>{r.buyer_name}</strong>
                        {r.buyer_phone && ` · ${r.buyer_phone}`}
                      </p>
                      <div className="referral-values">
                        <div>
                          <span>Preço registrado</span>
                          <b>{money(r.price)}</b>
                        </div>
                        <div>
                          <span>Parceiro indicador</span>
                          <b>{money(r.partner_fee)}</b>
                        </div>
                        <div>
                          <span>CS Car</span>
                          <b>{money(r.platform_fee)}</b>
                        </div>
                      </div>
                      <div className="referral-actions">
                        {admin &&
                          ["sold", "paid"].includes(r.status) &&
                          !r.platform_received_at && (
                            <button
                              disabled={busy}
                              className="btn outline small"
                              onClick={() => platformReceipt(r.id)}
                            >
                              Confirmar recebimento CS Car
                            </button>
                          )}
                        {r.platform_received_at && (
                          <span className="status paid">CS Car recebida</span>
                        )}
                        {r.status === "new" && (owner || admin) && (
                          <button
                            disabled={busy}
                            className="btn outline small"
                            onClick={() => updateReferral(r, "visit")}
                          >
                            Confirmar visita
                          </button>
                        )}
                        {["new", "visit"].includes(r.status) &&
                          (owner || admin) && (
                            <button
                              disabled={busy}
                              className="btn dark small"
                              onClick={() => updateReferral(r, "sold")}
                            >
                              Confirmar venda
                            </button>
                          )}
                        {r.status === "sold" &&
                          (r.broker_garage_id === garage?.id || admin) && (
                            <button
                              disabled={busy}
                              className="btn orange small"
                              onClick={() => updateReferral(r, "paid")}
                            >
                              Confirmar comissão recebida
                            </button>
                          )}
                        {["new", "visit"].includes(r.status) && (
                          <button
                            disabled={busy}
                            className="text-btn"
                            onClick={() => updateReferral(r, "cancelled")}
                          >
                            Cancelar indicação
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
              {!mine.length && (
                <div className="empty">
                  <Handshake />
                  <h3>A primeira conexão começa com você.</h3>
                  <p>Encontre um carro na rede e registre seu comprador.</p>
                  <button
                    className="btn dark"
                    onClick={() => setTab("network")}
                  >
                    Explorar veículos
                  </button>
                </div>
              )}
            </>
          )}
          {tab === "partners" && (
            <div className="referral-list">
              {pending.map((g) => (
                <article className="referral-card" key={g.id}>
                  <h3>{g.name}</h3>
                  <p>
                    {g.city}, {g.state} · {g.phone}
                  </p>
                  <div className="referral-actions">
                    <button
                      disabled={busy}
                      className="btn dark small"
                      onClick={() => approve(g.id, "approved")}
                    >
                      Aprovar parceiro
                    </button>
                    <button
                      disabled={busy}
                      className="text-btn"
                      onClick={() => approve(g.id, "rejected")}
                    >
                      Não aprovar
                    </button>
                  </div>
                </article>
              ))}
              {!pending.length && <p>Nenhuma solicitação pendente.</p>}
            </div>
          )}
          {loading && <p role="status">Carregando dados…</p>}
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={refresh}>Tentar novamente</button>
            </div>
          )}
          <p className="dashboard-footnote">
            <ShieldCheck size={14} />
            {isDemo
              ? "Demonstração local · nenhuma venda ou pagamento real"
              : "Rede privada · informações comerciais para parceiros aprovados"}
          </p>
        </main>
      </div>
      {detail && <VehicleDetails v={detail} onClose={() => setDetail(null)} />}
      {editing && garage && (
        <VehicleForm
          vehicle={editing}
          garage={garage}
          onClose={() => setEditing(null)}
          onSave={() => {
            setEditing(null);
            refresh();
            notify("Anúncio salvo.");
            setTab("own");
          }}
        />
      )}
      {referring && garage && (
        <ReferralForm
          vehicle={referring}
          garage={garage}
          existing={referrals}
          onClose={() => setReferring(null)}
          onSave={() => {
            setReferring(null);
            loadReferrals();
            setTab("referrals");
            notify("Indicação registrada com preço e comissões.");
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
function Auth({ onDone }: { onDone: () => void }) {
  const [signup, setSignup] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")),
      password = String(f.get("password"));
    try {
      if (signup) {
        const { error } = await supabase!.auth.signUp({
          email,
          password,
          options: {
            data: {
              garage_name: f.get("name"),
              city: f.get("city"),
              state: f.get("state"),
              phone: f.get("phone"),
            },
          },
        });
        if (error) throw error;
        setMessage(
          "Cadastro enviado. Confirme seu e-mail e aguarde a aprovação da CS Car.",
        );
      } else {
        const { error } = await supabase!.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onDone();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <Brand />
      <div className="auth-layout">
        <div>
          <p className="eyebrow">CS CAR / REDE DE PARCEIROS</p>
          <h1>
            Boas conexões
            <br />
            fazem <em>bons negócios.</em>
          </h1>
          <p>
            Encontre carros para seus clientes. Anuncie sua garagem.
            <br />
            Transforme indicações em novas oportunidades.
          </p>
          <Link href="/loja" className="text-link">
            Conhecer a loja <ArrowUpRight size={18} />
          </Link>
        </div>
        <form className="auth-card" onSubmit={submit}>
          <h2>{signup ? "Faça parte da rede." : "Bem-vindo de volta."}</h2>
          <p>
            {signup
              ? "Seu cadastro será analisado pela CS Car."
              : "Acesse o espaço da sua garagem."}
          </p>
          {signup && (
            <>
              <label>
                Nome da garagem
                <input name="name" required maxLength={120} />
              </label>
              <div className="form-grid">
                <label>
                  Cidade
                  <input name="city" required maxLength={100} />
                </label>
                <label>
                  UF
                  <input
                    name="state"
                    required
                    pattern="[A-Za-z]{2}"
                    maxLength={2}
                  />
                </label>
              </div>
              <label>
                WhatsApp
                <input
                  name="phone"
                  required
                  type="tel"
                  minLength={10}
                  maxLength={20}
                />
              </label>
            </>
          )}
          <label>
            E-mail
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={signup ? "new-password" : "current-password"}
            />
          </label>
          <button className="btn orange" disabled={busy}>
            {busy
              ? "Aguarde…"
              : signup
                ? "Solicitar cadastro"
                : "Entrar na rede"}
            <ArrowRight size={18} />
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              setSignup(!signup);
              setMessage("");
            }}
          >
            {signup
              ? "Já sou parceiro. Entrar"
              : "Quero cadastrar minha garagem"}
          </button>
          {message && (
            <p role="status" className="form-message">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
function ReferralForm({
  vehicle: v,
  garage,
  existing,
  onClose,
  onSave,
}: {
  vehicle: Vehicle;
  garage: Garage;
  existing: Referral[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      if (isDemo) {
        const r: Referral = {
          id: crypto.randomUUID(),
          vehicle_id: v.id,
          owner_garage_id: v.garage_id,
          broker_garage_id: garage.id,
          buyer_name: String(f.get("name")),
          buyer_phone: String(f.get("phone")),
          price: v.price,
          partner_fee: v.partner_fee || 0,
          platform_fee: v.platform_fee || 0,
          status: "new",
          created_at: new Date().toISOString(),
          vehicle_label: `${v.brand} ${v.model}`,
        };
        if (
          existing.some(
            (x) =>
              x.vehicle_id === v.id &&
              x.broker_garage_id === garage.id &&
              x.buyer_phone === r.buyer_phone &&
              !["cancelled", "paid"].includes(x.status),
          )
        )
          throw new Error(
            "Esse comprador já tem uma indicação ativa para este carro.",
          );
        localStorage.setItem("cs-referrals", JSON.stringify([r, ...existing]));
      } else {
        const { error } = await supabase!.rpc("create_referral", {
          target_vehicle: v.id,
          customer_name: String(f.get("name")),
          customer_phone: String(f.get("phone")),
        });
        if (error) throw error;
      }
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível registrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Uma nova conexão." onClose={onClose}>
      <form onSubmit={submit} className="stack-form">
        <p>
          {v.brand} {v.model} · {v.year}
        </p>
        <div className="price-summary">
          <p>
            Preço final <strong>{money(v.price)}</strong>
          </p>
          <p>
            Sua comissão <strong>{money(v.partner_fee || 0)}</strong>
          </p>
          <p>
            Parte da CS Car <strong>{money(v.platform_fee || 0)}</strong>
          </p>
          <small>As duas comissões já estão incluídas no preço final.</small>
        </div>
        <label>
          Nome do comprador
          <input
            name="name"
            required
            maxLength={120}
            placeholder="Nome de quem você está indicando"
          />
        </label>
        <label>
          WhatsApp do comprador
          <input
            name="phone"
            type="tel"
            required
            pattern="[0-9 ()+\-]{10,20}"
            maxLength={20}
            placeholder="(17) 99999-9999"
          />
        </label>
        <label className="checkbox-label">
          <input required type="checkbox" />
          Tenho autorização do comprador para compartilhar seu contato com a
          garagem responsável.
        </label>
        <p className="hint">
          O registro preserva o preço e as comissões atuais. Não reserva
          automaticamente o veículo.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy} className="btn orange">
          {busy ? "Registrando…" : "Registrar indicação"}
          <ArrowUpRight size={18} />
        </button>
      </form>
    </Modal>
  );
}
function VehicleForm({
  vehicle,
  garage,
  onClose,
  onSave,
}: {
  vehicle: Vehicle | "new";
  garage: Garage;
  onClose: () => void;
  onSave: () => void;
}) {
  const v = vehicle === "new" ? null : vehicle;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [price, setPrice] = useState(v?.price || 0),
    [fee, setFee] = useState(v?.partner_fee || 0),
    [platform, setPlatform] = useState(v?.platform_fee || 0);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      if (price < fee + platform)
        throw new Error("As comissões não podem superar o preço final.");
      const id = v?.id || crypto.randomUUID();
      let images = v?.images || [];
      const files = form
        .getAll("photos")
        .filter((f): f is File => f instanceof File && f.size > 0);
      if (files.length > 8) throw new Error("Selecione no máximo 8 fotos.");
      if (
        files.some(
          (f) =>
            f.size > 5 * 1024 * 1024 ||
            !["image/jpeg", "image/png", "image/webp"].includes(f.type),
        )
      )
        throw new Error("Use fotos JPG, PNG ou WebP de até 5 MB.");
      if (files.length) {
        if (isDemo) {
          images = await Promise.all(
            files.map(
              (file) =>
                new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                }),
            ),
          );
        } else {
          images = [];
          for (const file of files) {
            const ext = file.type.split("/")[1];
            const path = `${garage.id}/${id}/${crypto.randomUUID()}.${ext}`;
            const { error } = await supabase!.storage
              .from("vehicle-images")
              .upload(path, file);
            if (error) throw error;
            images.push(
              supabase!.storage.from("vehicle-images").getPublicUrl(path).data
                .publicUrl,
            );
          }
        }
      }
      if (!images.length) {
        if (isDemo) images = ["/cars/hatch.webp"];
        else throw new Error("Adicione pelo menos uma foto do veículo.");
      }
      const row: Vehicle = {
        id,
        garage_id: garage.id,
        garage_name: garage.name,
        brand: String(form.get("brand")).trim(),
        model: String(form.get("model")).trim(),
        version: String(form.get("version")).trim(),
        year: Number(form.get("year")),
        price,
        mileage: Number(form.get("mileage")),
        transmission: String(form.get("transmission")),
        fuel: String(form.get("fuel")),
        body: String(form.get("body")),
        color: String(form.get("color")),
        city: garage.city,
        state: garage.state,
        status: String(form.get("status")) as Vehicle["status"],
        images,
        description: String(form.get("description")),
        features: String(form.get("features"))
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        featured: !!v?.featured,
        partner_fee: fee,
        platform_fee: platform,
      };
      if (isDemo) {
        const all = readDemo();
        saveDemo(v ? all.map((x) => (x.id === id ? row : x)) : [row, ...all]);
      } else {
        const { garage_name, partner_fee, platform_fee, ...payload } = row;
        const { error } = await supabase!.rpc("save_vehicle", {
          vehicle_data: payload,
          broker_commission: fee,
          cs_commission: platform,
        });
        if (error) throw error;
      }
      onSave();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar. O armazenamento local pode estar cheio.",
      );
    } finally {
      setBusy(false);
    }
  }
  const input = (
    name: string,
    label: string,
    defaultValue: string | number = "",
    type = "text",
    required = true,
  ) => (
    <label key={name}>
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        type={type}
        required={required}
        min={type === "number" ? 0 : undefined}
        maxLength={type === "text" ? 160 : undefined}
      />
    </label>
  );
  return (
    <Modal
      title={v ? "Editar anúncio" : "Seu próximo anúncio."}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="stack-form">
        <div className="form-grid three">
          {input("brand", "Marca", v?.brand)}
          {input("model", "Modelo", v?.model)}
          {input("version", "Versão", v?.version)}
          <label>
            Ano
            <input
              name="year"
              type="number"
              min="1900"
              max="2200"
              required
              defaultValue={v?.year || 2022}
            />
          </label>
          {input("mileage", "Quilometragem", v?.mileage || 0, "number")}
          {input("color", "Cor", v?.color)}
          {[
            ["transmission", "Câmbio", ["Manual", "Automático"]],
            [
              "fuel",
              "Combustível",
              ["Flex", "Gasolina", "Diesel", "Elétrico", "Híbrido"],
            ],
            [
              "body",
              "Carroceria",
              ["Hatch", "Sedã", "SUV", "Picape", "Cupê", "Conversível", "Van"],
            ],
            ["status", "Status", ["available", "reserved", "draft", "sold"]],
          ].map(([name, label, opts]) => (
            <label key={name as string}>
              {label as string}
              <select
                name={name as string}
                defaultValue={
                  (v?.[name as keyof Vehicle] as string) ||
                  (opts as string[])[0]
                }
              >
                {(opts as string[]).map((o) => (
                  <option key={o} value={o}>
                    {statusLabel[o] || o}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="form-grid three">
          <label>
            Preço final (R$)
            <input
              type="number"
              min="1"
              step="0.01"
              required
              value={price || ""}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </label>
          <label>
            Comissão parceiro (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
            />
          </label>
          <label>
            Parte CS Car (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={platform}
              onChange={(e) => setPlatform(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="price-summary">
          <p>
            Valor para o responsável pelo veículo{" "}
            <strong>{money(price - fee - platform)}</strong>
          </p>
          <small>
            Preço final menos a comissão do parceiro e a parte da CS Car.
          </small>
        </div>
        <label>
          Descrição
          <textarea
            name="description"
            defaultValue={v?.description}
            rows={3}
            maxLength={5000}
            required
          />
        </label>
        <label>
          Itens e opcionais (separados por vírgula)
          <input
            name="features"
            defaultValue={v?.features.join(", ")}
            maxLength={1000}
          />
        </label>
        <label>
          Fotos do veículo
          <input
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
          />
          <small>
            Até 8 fotos de 5 MB. Ao selecionar novas fotos, a galeria anterior
            será substituída.
            {isDemo ? " Na demonstração, prefira arquivos pequenos." : ""}
          </small>
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy} className="btn orange">
          {busy ? "Salvando…" : "Salvar anúncio"}
          <CheckCircle2 size={18} />
        </button>
      </form>
    </Modal>
  );
}
