export type Vehicle = {
  id: string;
  garage_id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  price: number;
  mileage: number;
  transmission: string;
  fuel: string;
  body: string;
  color: string;
  city: string;
  state: string;
  status: "available" | "reserved" | "sold" | "draft";
  images: string[];
  description: string;
  features: string[];
  featured: boolean;
  partner_fee?: number;
  platform_fee?: number;
  garage_name?: string;
};
export type Garage = {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  contact_email?: string;
  status: string;
};
export const VEHICLE_CATALOG: Record<string, string[]> = {
  Chevrolet: ["Astra", "Onix", "Tracker", "S10"],
  Fiat: ["Argo", "Cronos", "Pulse", "Toro"],
  Ford: ["Ka", "EcoSport", "Ranger"],
  Honda: ["Civic", "City", "HR-V", "Fit"],
  Hyundai: ["HB20", "Creta", "Tucson"],
  Jeep: ["Renegade", "Compass", "Commander"],
  Toyota: ["Corolla", "Yaris", "Hilux", "SW4"],
  Volkswagen: ["Gol", "Polo", "T-Cross", "Virtus"],
};
export const VEHICLE_COLORS = [
  "Preto",
  "Branco",
  "Prata",
  "Cinza",
  "Vermelho",
  "Azul",
  "Verde",
  "Marrom",
];
export const BR_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
export const CITIES_BY_STATE: Record<string, string[]> = {
  SP: [
    "São Paulo",
    "Votuporanga",
    "São José do Rio Preto",
    "Catanduva",
    "Ribeirão Preto",
    "Campinas",
  ],
  MG: ["Belo Horizonte", "Uberlândia", "Uberaba"],
  PR: ["Curitiba", "Londrina", "Maringá"],
  RJ: ["Rio de Janeiro", "Niterói", "Petrópolis"],
  SC: ["Florianópolis", "Joinville", "Blumenau"],
  RS: ["Porto Alegre", "Caxias do Sul", "Pelotas"],
  GO: ["Goiânia", "Anápolis", "Rio Verde"],
};
export type Referral = {
  id: string;
  vehicle_id: string;
  owner_garage_id: string;
  broker_garage_id: string;
  buyer_name: string;
  buyer_phone: string;
  price: number;
  partner_fee: number;
  platform_fee: number;
  status: string;
  platform_received_at?: string | null;
  created_at: string;
  vehicle_label?: string;
};
export const money = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
export const whatsapp = (text: string) =>
  `https://wa.me/5517997448213?text=${encodeURIComponent(text)}`;
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export const garages: Garage[] = [
  {
    id: "joao",
    name: "João Automóveis",
    city: "São José do Rio Preto",
    state: "SP",
    phone: "",
    status: "approved",
  },
  {
    id: "marcelo",
    name: "Marcelo Multimarcas",
    city: "Votuporanga",
    state: "SP",
    phone: "",
    status: "approved",
  },
  {
    id: "premium",
    name: "Avenida Motors",
    city: "Catanduva",
    state: "SP",
    phone: "",
    status: "approved",
  },
];
const base = {
  status: "available" as const,
  description:
    "Veículo fictício para demonstrar a experiência da CS Car. Fotos ilustrativas: não representam necessariamente o modelo ou versão anunciados. Consulte a disponibilidade dos anúncios reais após o lançamento.",
  features: [
    "Ar-condicionado",
    "Direção assistida",
    "Vidros elétricos",
    "Central multimídia",
  ],
  state: "SP",
  featured: false,
};
export const demoVehicles: Vehicle[] = [
  {
    ...base,
    id: "astra",
    garage_id: "marcelo",
    garage_name: "Marcelo Multimarcas",
    brand: "Chevrolet",
    model: "Astra",
    version: "2.0 Advantage 8V",
    year: 2011,
    price: 36900,
    mileage: 128000,
    transmission: "Manual",
    fuel: "Flex",
    body: "Hatch",
    color: "Prata",
    city: "Votuporanga",
    images: ["/cars/hatch.webp"],
    partner_fee: 1500,
    platform_fee: 400,
    featured: true,
  },
  {
    ...base,
    id: "civic",
    garage_id: "premium",
    garage_name: "Avenida Motors",
    brand: "Honda",
    model: "Civic",
    version: "2.0 EXL CVT",
    year: 2020,
    price: 128900,
    mileage: 48000,
    transmission: "Automático",
    fuel: "Flex",
    body: "Sedã",
    color: "Cinza",
    city: "Catanduva",
    images: [
      "/sequence/desktop/001.webp",
      "/sequence/desktop/050.webp",
      "/sequence/desktop/100.webp",
    ],
    partner_fee: 3500,
    platform_fee: 900,
    featured: true,
  },
  {
    ...base,
    id: "golf",
    garage_id: "joao",
    garage_name: "João Automóveis",
    brand: "Volkswagen",
    model: "Golf",
    version: "1.4 TSI Highline",
    year: 2017,
    price: 98900,
    mileage: 71000,
    transmission: "Automático",
    fuel: "Gasolina",
    body: "Hatch",
    color: "Branco",
    city: "São José do Rio Preto",
    images: ["/cars/golf.webp"],
    partner_fee: 2500,
    platform_fee: 600,
    featured: true,
  },
  {
    ...base,
    id: "bmw",
    garage_id: "premium",
    garage_name: "Avenida Motors",
    brand: "BMW",
    model: "320i",
    version: "2.0 Sport GP Turbo",
    year: 2021,
    price: 219900,
    mileage: 32000,
    transmission: "Automático",
    fuel: "Flex",
    body: "Sedã",
    color: "Azul",
    city: "Catanduva",
    images: ["/cars/bmw.webp"],
    partner_fee: 6000,
    platform_fee: 1500,
    featured: true,
  },
  {
    ...base,
    id: "jeep",
    garage_id: "marcelo",
    garage_name: "Marcelo Multimarcas",
    brand: "Jeep",
    model: "Compass",
    version: "1.3 T270 Longitude",
    year: 2022,
    price: 139900,
    mileage: 39000,
    transmission: "Automático",
    fuel: "Flex",
    body: "SUV",
    color: "Preto",
    city: "Votuporanga",
    images: ["/cars/suv.webp"],
    partner_fee: 4000,
    platform_fee: 1000,
  },
  {
    ...base,
    id: "polo",
    garage_id: "joao",
    garage_name: "João Automóveis",
    brand: "Volkswagen",
    model: "Polo",
    version: "1.0 TSI Comfortline",
    year: 2023,
    price: 89900,
    mileage: 24000,
    transmission: "Automático",
    fuel: "Flex",
    body: "Hatch",
    color: "Vermelho",
    city: "São José do Rio Preto",
    images: ["/cars/polo.webp"],
    partner_fee: 2200,
    platform_fee: 550,
  },
];
export const initialReferrals: Referral[] = [
  {
    id: "ref-demo-1",
    vehicle_id: "astra",
    owner_garage_id: "marcelo",
    broker_garage_id: "joao",
    buyer_name: "Paulo (exemplo)",
    buyer_phone: "",
    price: 36900,
    partner_fee: 1500,
    platform_fee: 400,
    status: "visit",
    created_at: "2026-10-27T12:00:00Z",
    vehicle_label: "Chevrolet Astra",
  },
];
