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
  LogOut,
  CheckCircle2,
  Pencil,
  ShieldCheck,
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
  garages,
  demoVehicles,
  money,
  whatsapp,
  VEHICLE_CATALOG,
  VEHICLE_VERSIONS,
  VEHICLE_FEATURE_GROUPS,
  VEHICLE_COLORS,
  BR_STATES,
  CITIES_BY_STATE,
  isSampleVehicle,
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
  rejected: "Não aprovado",
};
export default function Network() {
  const [garage, setGarage] = useState<Garage | null>(
      isDemo ? garages[0] : null,
    ),
    [admin, setAdmin] = useState(false),
    [teamMember, setTeamMember] = useState(false),
    [accountPending, setAccountPending] = useState(false),
    [canEdit, setCanEdit] = useState(isDemo),
    [locations, setLocations] = useState<Garage[]>(isDemo ? garages : []),
    [ready, setReady] = useState(isDemo),
    [tab, setTab] = useState("overview"),
    [filters, setFilters] = useState(emptyFilters),
    [detail, setDetail] = useState<Vehicle | null>(null),
    [editing, setEditing] = useState<Vehicle | "new" | null>(null),
    [toast, setToast] = useState("");
  const { vehicles, loading, error, refresh } = useVehicles(true);
  const networkVehicles = vehicles.filter(
    (vehicle) => !isSampleVehicle(vehicle),
  );
  function notify(message: string) {
    setToast(message);
  }
  async function loadIdentity() {
    if (!supabase) {
      setReady(true);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const [{ data: locations }, { data: member }, { data: isAdmin }] = await Promise.all([
        supabase.from("garages").select("*").eq("status", "approved").eq("active", true).order("name"),
        supabase.from("team_members").select("user_id,role,active,display_name,can_edit_vehicles,commission_percent").eq("user_id", user.id).maybeSingle(),
        supabase.rpc("is_admin"),
      ]);
      setGarage(locations?.[0] || null);
      setLocations((locations || []) as Garage[]);
      const hasPanelAccess =
        !!member?.active && ["admin", "seller"].includes(member.role);
      setTeamMember(hasPanelAccess);
      setAccountPending(!hasPanelAccess);
      setAdmin(!!isAdmin || member?.role === "admin");
      setCanEdit(!!isAdmin || member?.role === "admin" || !!member?.can_edit_vehicles);
    } else {
      setGarage(null);
      setAdmin(false);
      setTeamMember(false);
      setAccountPending(false);
      setCanEdit(false);
    }
    setReady(true);
  }
  useEffect(() => {
    loadIdentity();
    const sub = supabase?.auth.onAuthStateChange(() => {
      setTimeout(() => {
        loadIdentity();
        refresh();
      }, 0);
    });
    return () => sub?.data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 7000);
    return () => clearTimeout(t);
  }, [toast]);
  if (!ready)
    return (
      <div className="auth-page">
        <Brand />
        <p>Verificando seu acesso…</p>
      </div>
    );
  if (!isDemo && !teamMember)
    return <Auth onDone={loadIdentity} pending={accountPending} />;
  const nav: [string, string, typeof LayoutDashboard][] = [
    ["overview", "Visão geral", LayoutDashboard],
    ["network", "Veículos", CarFront],
    ...(admin ? [["partners", "Equipe e locais", Users] as [string,string,typeof LayoutDashboard]] : []),
  ];
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">CS CAR · EQUIPE INTERNA</div>
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
                  {
                    networkVehicles.filter((v) => v.status === "available")
                      .length
                  }
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="network-status">
            <span className="live-dot" />
            Operação interna CS Car.
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
            <span>CS CAR / PAINEL</span>
            <b>{nav.find((n) => n[0] === tab)?.[1]}</b>
          </div>
          <div className="profile">
            <span className="avatar">{garage?.name.slice(0, 1) || "CS"}</span>
            <div>
              <strong>{garage?.name || "CS Car Administração"}</strong>
              <small>{admin ? "Administrador" : "Vendedor"}{isDemo ? " · demonstração" : ""}</small>
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
              <p className="eyebrow">CS CAR / OPERAÇÃO</p>
              <h1>
                {tab === "overview" ? (
                  <>
                    Estoque em movimento.
                  </>
                ) : tab === "network" ? (
                  "Veículos CS Car."
                ) : tab === "partners" ? (
                  "Equipe e locais."
                ) : (
                  "Painel CS Car."
                )}
              </h1>
              <p>
                {tab === "overview"
                  ? "Acompanhe os anúncios e a disponibilidade dos veículos."
                  : tab === "network"
                    ? "Consulte e organize os veículos anunciados pela CS Car."
                    : tab === "partners"
                      ? "Gerencie contas internas, permissões, comissões e locais físicos."
                    : "Acompanhe os anúncios e os locais da operação."}
              </p>
            </div>
            {garage && canEdit && (
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
                    label: "Veículos disponíveis",
                    value: networkVehicles.filter(
                      (v) => v.status === "available",
                    ).length,
                    icon: CarFront,
                    note: "Oportunidades disponíveis",
                  },
                  {
                    label: "Veículos vendidos",
                    value: networkVehicles.filter((v) => v.status === "sold").length,
                    icon: CheckCircle2,
                    note: "Anúncios marcados como vendidos",
                  },
                  {
                    label: "Locais ativos",
                    value: locations.filter((place) => place.active !== false).length,
                    icon: NetworkIcon,
                    note: "Pontos de visita dos veículos",
                  },
                  {
                    label: "Sua permissão",
                    value: admin ? "Admin" : canEdit ? "Editar" : "Consulta",
                    icon: ShieldCheck,
                    note: "Acesso definido pelo administrador",
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
                    UMA OPERAÇÃO. TODOS OS LOCAIS.
                  </span>
                  <h2>
                    Veículos organizados. <em>Equipe conectada.</em>
                  </h2>
                  <p>
                    Consulte o estoque e veja em qual local cada veículo está disponível.
                  </p>
                </div>
                <button className="btn light" onClick={() => setTab("network")}>
                  Ver veículos <ArrowUpRight size={18} />
                </button>
              </div>
              <div className="dashboard-section-title">
                <h2>Anúncios recentes</h2>
                <button className="text-btn" onClick={() => setTab("network")}>
                  Ver todos <ArrowRight size={17} />
                </button>
              </div>
              <div className="car-grid">
                {vehicles
                  .filter(
                    (v) =>
                      !isSampleVehicle(v) &&
                      v.status === "available",
                  )
                  .slice(0, 3)
                  .map((v) => (
                    <VehicleCard
                      key={v.id}
                      v={v}
                      network
                      onOpen={() => setDetail(v)}
                    onRefer={undefined}
                    />
                  ))}
              </div>
            </>
          )}
          {tab === "network" && (
            <>
              <FilterBar
                vehicles={networkVehicles}
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
                  <option value="price-up">Menor preço</option>
                  <option value="newest">Mais novos</option>
                </select>
              </div>
              <p className="results-count">
                {filterVehicles(networkVehicles, filters, [], true).length}{" "}
                veículos encontrados
              </p>
              <div className="car-grid">
                {filterVehicles(networkVehicles, filters, [], true).map((v) => (
                  <VehicleCard
                    key={v.id}
                    v={v}
                    network
                    onOpen={() => setDetail(v)}
                    onRefer={undefined}
                  />
                ))}
              </div>
              {!filterVehicles(networkVehicles, filters, [], true).length && (
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
          {tab === "partners" && (
            <TeamAdmin onUpdate={() => loadIdentity()} notify={notify} />
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
              : "Acesso interno CS Car · permissões gerenciadas pelo administrador"}
          </p>
        </main>
      </div>
      {detail && <VehicleDetails v={detail} onClose={() => setDetail(null)} />}
      {editing && garage && (
        <VehicleForm
          vehicle={editing}
          garage={garage}
          locations={locations}
          onClose={() => setEditing(null)}
          onSave={() => {
            setEditing(null);
            refresh();
            notify("Anúncio salvo.");
            setTab("network");
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
type TeamRecord = { user_id: string; display_name: string; role: "admin" | "seller" | "member"; email: string; can_edit_vehicles: boolean; commission_percent: number; active: boolean };
function TeamAdmin({ onUpdate, notify }: { onUpdate: () => void; notify: (message: string) => void }) {
  const [members, setMembers] = useState<TeamRecord[]>([]);
  const [locations, setLocations] = useState<Garage[]>([]);
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState("");
  async function load() {
    setMembersLoading(true);
    setMembersError("");
    try {
      const [{ data: { user }, error: userError }, { data: places, error: placesError }] = await Promise.all([
        supabase!.auth.getUser(),
        supabase!.from("garages").select("*").order("name"),
      ]);
      if (userError) throw userError;
      if (placesError) throw new Error("Não foi possível carregar os locais físicos.");
      setLocations((places || []) as Garage[]);
      if (!user) throw new Error("Sessão encerrada. Entre novamente para gerenciar a equipe.");
      const { data, error } = await supabase!.from("team_members").select("*").order("created_at");
      if (error) throw new Error("Não foi possível carregar as contas. Confirme que a migração de cadastro de membros foi aplicada.");
      setMembers((data || []) as TeamRecord[]);
    } catch (error) {
      setMembers([]);
      setMembersError(error instanceof Error ? error.message : "Não foi possível carregar a equipe.");
    } finally {
      setMembersLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);
  async function saveMember(member: TeamRecord) {
    setBusy(true);
    try {
      const { error } = await supabase!.from("team_members").update({ role: member.role, can_edit_vehicles: member.role === "seller" && member.can_edit_vehicles, commission_percent: member.role === "seller" ? member.commission_percent : 0, active: member.active, updated_at: new Date().toISOString() }).eq("user_id", member.user_id).neq("role", "admin");
      if (error) throw new Error(error.message || "Não foi possível salvar o perfil.");
      notify("Perfil e permissões salvos.");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao salvar o perfil.");
    } finally {
      setBusy(false);
    }
  }
  async function addLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    const { error } = await supabase!.from("garages").insert({ name: form.get("name"), city: form.get("city"), state: form.get("state"), phone: String(form.get("phone") || ""), contact_email: String(form.get("email") || ""), address: String(form.get("address") || ""), notes: String(form.get("notes") || ""), status: "approved", active: true });
    if (error) notify(error.message); else { formElement.reset(); setState(""); notify("Local adicionado."); await load(); onUpdate(); }
  }
  async function toggleLocation(place: Garage) {
    const { error } = await supabase!.from("garages").update({ active: place.active === false }).eq("id", place.id);
    if (error) notify(error.message); else { notify(place.active === false ? "Local ativado." : "Local desativado."); await load(); onUpdate(); }
  }
  return <div className="team-admin">
    <section className="admin-panel"><div className="dashboard-section-title"><h2>Equipe CS Car</h2><span>Contas internas · comissão sobre o preço anunciado</span></div>
      <p className="team-load-state">Qualquer pessoa pode criar uma conta. Aqui, o administrador libera o acesso interno e define as permissões de cada vendedor.</p>
      {members.length > 0 && <div className="team-member-list">{members.map((member) => <article className="team-member" key={member.user_id}><div><strong>{member.display_name || member.email}</strong><small>{member.email} · {member.role === "admin" ? "Administrador" : member.role === "seller" ? "Vendedor" : "Membro sem acesso ao painel"}</small></div>{member.role === "admin" ? <span className="status paid">Administrador</span> : <><label className="team-role"><span>Perfil</span><select aria-label={`Perfil de ${member.display_name || member.email}`} value={member.role} onChange={(e) => setMembers((items) => items.map((m) => m.user_id === member.user_id ? {...m, role:e.target.value as TeamRecord["role"]} : m))}><option value="member">Membro</option><option value="seller">Vendedor</option></select></label>{member.role === "seller" && <><label className="team-permission"><input type="checkbox" checked={member.can_edit_vehicles} onChange={(e) => setMembers((items) => items.map((m) => m.user_id === member.user_id ? {...m, can_edit_vehicles:e.target.checked} : m))}/> Pode editar anúncios</label><label className="team-commission"><span>Comissão %</span><input aria-label={`Comissão de ${member.display_name || member.email}`} type="number" min="0" max="100" step="0.01" value={member.commission_percent} onChange={(e) => setMembers((items) => items.map((m) => m.user_id === member.user_id ? {...m, commission_percent:Number(e.target.value)} : m))}/></label></>}<button type="button" className="btn outline small" disabled={busy} onClick={() => void saveMember(member)}>{busy ? "Salvando…" : "Salvar"}</button></>}</article>)}</div>}
    </section>
    <section className="admin-panel"><div className="dashboard-section-title"><h2>Locais dos veículos</h2><span>Locais físicos, sem contas de acesso</span></div>
      <form className="location-form" onSubmit={addLocation}><input name="name" placeholder="Nome do local/garagem" aria-label="Nome do local" required/><input name="address" placeholder="Endereço ou referência" aria-label="Endereço"/><div className="form-grid"><select name="state" aria-label="Estado" required value={state} onChange={(e)=>setState(e.target.value)}><option value="">Estado</option>{BR_STATES.map((uf)=><option key={uf}>{uf}</option>)}</select><select name="city" aria-label="Cidade" required disabled={!state}><option value="">Cidade</option>{(CITIES_BY_STATE[state]||[]).map((city)=><option key={city}>{city}</option>)}</select></div><input name="phone" placeholder="WhatsApp do local (opcional)" aria-label="WhatsApp do local"/><input name="email" placeholder="E-mail do local (opcional)" aria-label="E-mail do local" type="email"/><input name="notes" placeholder="Observações (opcional)" aria-label="Observações"/><button className="btn orange">Adicionar local</button></form>
      <div className="team-member-list">{locations.map((place)=><article className="team-member" key={place.id}><div><strong>{place.name}</strong><small>{place.address ? `${place.address} · ` : ""}{place.city}, {place.state}{place.phone ? ` · ${place.phone}` : ""}</small></div><span className={place.active && place.status === "approved" ? "status paid" : "status draft"}>{place.active === false ? "Inativo" : place.status === "approved" ? "Aprovado" : "Pendente"}</span><button type="button" className="btn outline small" onClick={() => void toggleLocation(place)}>{place.active === false ? "Ativar" : "Desativar"}</button></article>)}</div>
    </section>
  </div>;
}
function Auth({ onDone, pending = false }: { onDone: () => void; pending?: boolean }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [mode, setMode] = useState<"login" | "signup">("login");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")), password = String(f.get("password")), displayName = String(f.get("display_name") || "").trim();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase!.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
        if (error) throw error;
        if (data.session) onDone();
        else setMessage("Conta criada. Se a confirmação de e-mail estiver ativa no Supabase, confirme o endereço e depois entre. O administrador precisa liberar o acesso ao painel.");
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
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
          <p className="eyebrow">CS CAR / EQUIPE INTERNA</p>
          <h1>
            Boas conexões
            <br />
            fazem <em>bons negócios.</em>
          </h1>
          <p>
            Gerencie veículos, locais e acessos da equipe CS Car.
            <br />
            Controle anúncios e permissões em um só lugar.
          </p>
          <Link href="/loja" className="text-link">
            Conhecer a loja <ArrowUpRight size={18} />
          </Link>
        </div>
        {pending ? <section className="auth-card auth-pending"><h2>Conta aguardando liberação</h2><p>Sua conta está cadastrada como membro. Peça ao administrador da CS Car para liberar o perfil de vendedor.</p><button type="button" className="btn outline" onClick={() => void supabase!.auth.signOut().then(onDone)}>Sair</button><button type="button" className="text-link" onClick={onDone}>Verificar acesso</button></section> : <form className="auth-card" onSubmit={submit}>
          <h2>{mode === "login" ? "Bem-vindo de volta." : "Crie sua conta."}</h2>
          <p>{mode === "login" ? "Entre no painel ou crie uma conta de membro." : "Sua conta começa sem acesso interno; o administrador poderá promovê-la a vendedor."}</p>
          {mode === "signup" && <label>Nome<input name="display_name" required maxLength={120} autoComplete="name" /></label>}
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
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>
          <button className="btn orange" disabled={busy}>
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
            <ArrowRight size={18} />
          </button>
          {message && (
            <p role="status" className="form-message">
              {message}
            </p>
          )}
          <button type="button" className="auth-mode-toggle" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Ainda não tem conta? Cadastre-se" : "Já tem conta? Entrar"}</button>
        </form>}
      </div>
    </div>
  );
}
function VehicleForm({
  vehicle,
  garage,
  locations,
  onClose,
  onSave,
}: {
  vehicle: Vehicle | "new";
  garage: Garage;
  locations: Garage[];
  onClose: () => void;
  onSave: () => void;
}) {
  const v = vehicle === "new" ? null : vehicle;
  const [locationId, setLocationId] = useState(v?.garage_id || garage.id);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [step, setStep] = useState(1),
    [brand, setBrand] = useState(v?.brand || ""),
    [model, setModel] = useState(v?.model || ""),
    [price, setPrice] = useState(v?.price || 0);
  const [features, setFeatures] = useState<string[]>(v?.features || []);
  const [featureSearch, setFeatureSearch] = useState("");
  const versionOptions = [
    ...new Set([...VEHICLE_VERSIONS, ...(v?.version ? [v.version] : [])]),
  ];
  function validateStep(targetStep: number) {
    const form = document.querySelector<HTMLFormElement>(
      ".stack-form[data-vehicle-form]",
    );
    const section = form?.querySelector<HTMLElement>(
      `.vehicle-step[data-step="${targetStep}"]`,
    );
    const invalid = [
      ...(section?.querySelectorAll<HTMLElement>("input,select,textarea") ||
        []),
    ].find((field) =>
      field instanceof HTMLInputElement ||
      field instanceof HTMLSelectElement ||
      field instanceof HTMLTextAreaElement
        ? !field.checkValidity()
        : false,
    ) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | undefined;
    if (invalid) {
      setStep(targetStep);
      setError(invalid.validationMessage || "Confira os campos desta etapa.");
      requestAnimationFrame(() => invalid.focus());
      return false;
    }
    setError("");
    return true;
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const selectedLocation = locations.find((place) => place.id === locationId && place.active !== false);
      if (!selectedLocation) throw new Error("Selecione um local ativo para o veículo.");
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
            const path = `${locationId}/${id}/${crypto.randomUUID()}.${ext}`;
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
        garage_id: selectedLocation.id,
        garage_name: selectedLocation.name,
        brand,
        model,
        version: String(form.get("version")).trim(),
        year: Number(form.get("year")),
        price,
        mileage: Number(form.get("mileage")),
        transmission: String(form.get("transmission")),
        fuel: String(form.get("fuel")),
        body: String(form.get("body")),
        color: String(form.get("color")),
        city: selectedLocation.city,
        state: selectedLocation.state,
        status: String(form.get("status")) as Vehicle["status"],
        images,
        description: String(form.get("description")),
        features,
        featured: !!v?.featured,
        partner_fee: v?.partner_fee || 0,
        platform_fee: 0,
      };
      if (isDemo) {
        const all = readDemo();
        saveDemo(v ? all.map((x) => (x.id === id ? row : x)) : [row, ...all]);
      } else {
        const { garage_name, partner_fee, platform_fee, ...payload } = row;
        const { error } = await supabase!.rpc("save_vehicle", {
          vehicle_data: payload,
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
    <input
      name={name}
      defaultValue={defaultValue}
      type={type}
      placeholder={label}
      aria-label={label}
      required={required}
      min={type === "number" ? 0 : undefined}
      maxLength={type === "text" ? 160 : undefined}
    />
  );
  return (
    <Modal
      title={v ? "Editar veículo" : "Novo anúncio"}
      onClose={onClose}
      wide
    >
      <p className="vehicle-form-intro">
        {v ? "Atualize as informações do veículo." : "Dados organizados em poucos passos."}
      </p>
      <form
        onSubmit={submit}
        className="stack-form"
        data-step={step}
        data-vehicle-form
        noValidate
      >
        <div
          className="vehicle-tabs"
          role="tablist"
          aria-label="Etapas do anúncio"
        >
          {[
            ["1", "Veículo"],
            ["2", "Preço"],
            ["3", "Fotos e descrição"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={step === Number(value)}
              className={step === Number(value) ? "active" : ""}
              onClick={() => setStep(Number(value))}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="vehicle-step" data-step="1">
          <p className="vehicle-step-caption">Identificação e características</p>
          <div className="form-grid vehicle-grid">
                <select name="garage_id" value={locationId} aria-label="Local do veículo" required onChange={(event) => setLocationId(event.target.value)}>
                  <option value="" disabled>Local do veículo</option>
                  {locations.filter((place) => place.active !== false && place.status === "approved").map((place) => <option key={place.id} value={place.id}>{place.name} · {place.city}, {place.state}</option>)}
                </select>
                <select
                  name="brand"
                  value={brand}
                  required
                  aria-label="Marca"
                  onChange={(e) => {
                    setBrand(e.target.value);
                    setModel("");
                  }}
                >
                  <option value="" disabled>
                    Marca do veículo
                  </option>
                  {Object.keys(VEHICLE_CATALOG).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                  {brand && !VEHICLE_CATALOG[brand] && <option>{brand}</option>}
                </select>
                <select
                  name="model"
                  value={model}
                  required
                  disabled={!brand}
                  aria-label="Modelo"
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="" disabled>
                    Modelo do veículo
                  </option>
                  {[
                    ...new Set([
                      ...(VEHICLE_CATALOG[brand] || []),
                      ...(v?.brand === brand && v?.model ? [v.model] : []),
                    ]),
                  ].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <select
                  name="version"
                  defaultValue={v?.version || ""}
                  required
                  aria-label="Versão"
                >
                  <option value="" disabled>
                    Versão do veículo
                  </option>
                  {versionOptions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <select
                  name="year"
                  defaultValue={v?.year || ""}
                  required
                  aria-label="Ano"
                >
                  <option value="" disabled>
                    Ano do veículo
                  </option>
                  {Array.from(
                    { length: new Date().getFullYear() - 1980 + 2 },
                    (_, i) => new Date().getFullYear() + 1 - i,
                  ).map((year) => (
                    <option key={year}>{year}</option>
                  ))}
                  {v?.year && v.year < 1980 && <option>{v.year}</option>}
                </select>
                {input(
                  "mileage",
                  "Quilometragem em km",
                  v?.mileage ?? "",
                  "number",
                )}
                <select
                  name="color"
                  defaultValue={v?.color || ""}
                  required
                  aria-label="Cor"
                >
                  <option value="" disabled>
                    Cor do veículo
                  </option>
                  {VEHICLE_COLORS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
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
                    [
                      "Hatch",
                      "Sedã",
                      "SUV",
                      "Picape",
                      "Cupê",
                      "Conversível",
                      "Van",
                    ],
                  ],
                  [
                    "status",
                    "Status",
                    ["available", "reserved", "draft", "sold"],
                  ],
                ].map(([name, label, opts]) => (
                  <select
                    key={name as string}
                    name={name as string}
                    aria-label={label as string}
                    required
                    defaultValue={
                      (v?.[name as keyof Vehicle] as string) ||
                      (opts as string[])[0]
                    }
                  >
                    <option value="" disabled>
                      {label as string}
                    </option>
                    {(opts as string[]).map((o) => (
                      <option key={o} value={o}>
                        {statusLabel[o] || o}
                      </option>
                    ))}
                  </select>
                ))}
          </div>
        </div>
        <div className="vehicle-step" data-step="2">
          <p className="vehicle-step-caption">Preço anunciado</p>
          <div className="vehicle-price-fields">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={price || ""}
                  placeholder="Preço final (R$)"
                  aria-label="Preço final em reais"
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
          </div>
        </div>
        <div className="vehicle-step" data-step="3">
          <p className="vehicle-step-caption">Conte o que torna este carro especial</p>
          <div className="vehicle-details-fields">
              <textarea
                name="description"
                defaultValue={v?.description}
                rows={3}
                maxLength={5000}
                placeholder="Sobre o carro: conte o estado, histórico e diferenciais..."
                aria-label="Sobre o carro"
                required
              />
              <fieldset className="feature-picker">
                <legend>Opcionais e diferenciais</legend>
                <input
                  className="feature-search"
                  type="search"
                  value={featureSearch}
                  placeholder="Buscar opcional..."
                  aria-label="Buscar opcional ou diferencial"
                  onChange={(event) => setFeatureSearch(event.target.value)}
                />
                <input
                  type="hidden"
                  name="features"
                  value={features.join(",")}
                />
                <div
                  className="feature-options feature-options-scroll"
                  role="group"
                  aria-label="Selecione os opcionais e diferenciais. Role horizontalmente para ver todos"
                >
                  {Object.entries(VEHICLE_FEATURE_GROUPS).flatMap(
                    ([group, choices]) => [
                      ...(choices.some((item) => item.toLowerCase().includes(featureSearch.trim().toLowerCase())) ? [<span className="feature-group-label" key={`group-${group}`}>{group}</span>] : []),
                      ...choices.map((item) => {
                        if (!item.toLowerCase().includes(featureSearch.trim().toLowerCase())) return null;
                        const selected = features.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            className={`feature-chip${selected ? " selected" : ""}`}
                            aria-label={`${group}: ${item}`}
                            aria-pressed={selected}
                            onClick={() =>
                              setFeatures((current) =>
                                selected
                                  ? current.filter((value) => value !== item)
                                  : [...current, item],
                              )
                            }
                          >
                            {item}
                          </button>
                        );
                      }),
                    ],
                  )}
                  {features
                    .filter(
                      (item) =>
                        !Object.values(VEHICLE_FEATURE_GROUPS)
                          .flat()
                          .includes(item),
                    )
                    .map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="feature-chip selected"
                        aria-label={`Remover opcional ${item}`}
                        aria-pressed="true"
                        onClick={() =>
                          setFeatures((current) =>
                            current.filter((value) => value !== item),
                          )
                        }
                      >
                        {item}
                      </button>
                    ))}
                </div>
                {features.length > 0 && (
                  <div className="selected-features" aria-label="Opcionais selecionados">
                    {features.map((item) => (
                      <button key={item} type="button" onClick={() => setFeatures((current) => current.filter((value) => value !== item))} aria-label={`Remover ${item}`}>
                        {item}<span aria-hidden="true">×</span>
                      </button>
                    ))}
                  </div>
                )}
              </fieldset>
            <div className="vehicle-photo-row">
              <label className="photo-picker">
                <span>Adicionar fotos</span>
                <small>JPG, PNG ou WebP · até 8</small>
                <input
                  name="photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  aria-label="Selecionar fotos do veículo"
                />
              </label>
            </div>
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="vehicle-form-actions">
          {step > 1 && (
            <button
              type="button"
              className="btn outline"
              onClick={() => setStep(step - 1)}
            >
              Voltar
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              className="btn orange"
              onClick={() => validateStep(step) && setStep(step + 1)}
            >
              Continuar <ArrowRight size={18} />
            </button>
          ) : (
            <button disabled={busy} className="btn orange">
              {busy ? "Salvando…" : "Salvar anúncio"}
              <CheckCircle2 size={18} />
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
