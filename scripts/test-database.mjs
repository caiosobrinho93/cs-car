import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema public,auth,storage to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
grant select,insert,update,delete on storage.objects to authenticated;`);
await db.exec(await readFile("supabase/001_initial.sql", "utf8"));
const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
];
for (let i = 0; i < 4; i++)
  await db.query("insert into auth.users values($1,$2)", [
    ids[i],
    {
      garage_name: ["Joao", "Marcelo", "Pending", "CS"][i],
      city: "Teste",
      state: "SP",
      phone: "17999999999",
    },
  ]);
await db.query("insert into public.admin_users values($1)", [ids[3]]);
await db.query(
  "update public.garages set status='approved' where owner_id<>$1",
  [ids[2]],
);
const gs = (await db.query("select id,owner_id from public.garages")).rows;
const gid = (i) => gs.find((g) => g.owner_id === ids[i]).id;
async function as(i, fn) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    ids[i],
  ]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
async function anon(fn) {
  await db.exec("set role anon");
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
let checks = 0;
async function denied(fn) {
  await assert.rejects(fn);
  checks++;
}
const v = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  brand: "Chevrolet",
  model: "Astra",
  version: "2.0",
  year: 2011,
  price: 36900,
  mileage: 100000,
  transmission: "Manual",
  fuel: "Flex",
  body: "Hatch",
  color: "Prata",
  status: "available",
  images: ["https://example.com/car.webp"],
  description: "Teste",
  features: ["Ar"],
};
await as(1, () => db.query("select public.save_vehicle($1,1500,400)", [v]));
checks++;
assert.equal(
  (await anon(() => db.query("select * from public.vehicles"))).rows.length,
  1,
);
checks++;
await denied(() => anon(() => db.query("select * from public.vehicle_terms")));
assert.equal(
  (await as(2, () => db.query("select * from public.vehicle_terms"))).rows
    .length,
  0,
);
checks++;
await denied(() =>
  as(0, () =>
    db.query("select public.save_vehicle($1,1500,400)", [{ ...v, price: 1 }]),
  ),
);
await denied(() =>
  as(0, () => db.query("select public.save_vehicle($1,1500,400)", [v])),
);
await denied(() =>
  as(2, () =>
    db.query("select public.create_referral($1,$2,$3)", [
      v.id,
      "Paulo",
      "17999999999",
    ]),
  ),
);
await denied(() =>
  as(0, () => db.query("update public.garages set status='approved'")),
);
await denied(() =>
  as(0, () => db.query("select public.review_garage($1,'approved')", [gid(2)])),
);
const rid = (
  await as(0, () =>
    db.query("select public.create_referral($1,$2,$3) as id", [
      v.id,
      "Paulo",
      "(17) 99999-9999",
    ]),
  )
).rows[0].id;
checks++;
await denied(() =>
  as(0, () =>
    db.query("select public.create_referral($1,$2,$3)", [
      v.id,
      "Paulo",
      "17999999999",
    ]),
  ),
);
await as(1, () =>
  db.query("select public.save_vehicle($1,2500,500)", [{ ...v, price: 39900 }]),
);
const snapshot = (await as(0, () => db.query("select * from public.referrals")))
  .rows[0];
assert.equal(Number(snapshot.price), 36900);
assert.equal(Number(snapshot.partner_fee), 1500);
checks++;
assert.equal(
  (await as(2, () => db.query("select * from public.referrals"))).rows.length,
  0,
);
checks++;
await denied(() => anon(() => db.query("select * from public.referrals")));
await denied(() =>
  as(0, () => db.query("select public.transition_referral($1,'sold')", [rid])),
);
await as(1, () =>
  db.query("select public.transition_referral($1,'visit')", [rid]),
);
await as(1, () =>
  db.query("select public.transition_referral($1,'sold')", [rid]),
);
checks++;
assert.equal(
  (await anon(() => db.query("select * from public.vehicles"))).rows.length,
  0,
);
checks++;
await denied(() =>
  as(1, () => db.query("select public.transition_referral($1,'paid')", [rid])),
);
await as(0, () =>
  db.query("select public.transition_referral($1,'paid')", [rid]),
);
checks++;
await denied(() =>
  as(0, () => db.query("select public.confirm_platform_receipt($1)", [rid])),
);
await as(3, () =>
  db.query("select public.confirm_platform_receipt($1)", [rid]),
);
checks++;
await denied(() =>
  as(1, () => db.query("select public.save_vehicle($1,1500,400)", [v])),
);
await denied(() =>
  as(0, () =>
    db.query(
      "insert into storage.objects(bucket_id,name) values('vehicle-images',$1)",
      [`${gid(1)}/foreign.webp`],
    ),
  ),
);
await as(0, () =>
  db.query(
    "insert into storage.objects(bucket_id,name) values('vehicle-images',$1)",
    [`${gid(0)}/own.webp`],
  ),
);
checks++;
console.log(
  `${checks} verificações SQL aprovadas: RLS, autoria, aprovação, snapshot, transições e storage (PGlite com Auth/Storage simulados).`,
);
await db.close();
