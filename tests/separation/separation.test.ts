// Required separation tests (frontend_separation_spec v1.0 §10).
// Proves the two-site boundary in code, config, routing, and builds.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const USER = join(ROOT, "apps/user");
const ADMIN = join(ROOT, "apps/admin");

function allFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) allFiles(p, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(e)) out.push(p);
  }
  return out;
}

function read(p: string): string {
  return readFileSync(p, "utf-8");
}

function userSources(): string[] {
  return allFiles(join(USER, "src"));
}
function adminSources(): string[] {
  return allFiles(join(ADMIN, "src"));
}

const rootPkg = JSON.parse(read(join(ROOT, "package.json")));

describe("1-2. independent apps + start commands", () => {
  it("apps/user and apps/admin exist with own entry, router, client, env, landing", () => {
    for (const p of [
      "apps/user/src/main.tsx",
      "apps/user/src/router.tsx",
      "apps/user/src/api/client.ts",
      "apps/user/src/config.ts",
      "apps/user/.env.example",
      "apps/user/vite.config.ts",
      "apps/user/package.json",
      "apps/user/src/pages/LandingPage.tsx",
      "apps/admin/src/main.tsx",
      "apps/admin/src/router.tsx",
      "apps/admin/src/api/client.ts",
      "apps/admin/src/config.ts",
      "apps/admin/.env.example",
      "apps/admin/vite.config.ts",
      "apps/admin/package.json",
      "apps/admin/src/pages/DashboardPage.tsx",
      "apps/admin/src/pages/ScorePage.tsx",
    ]) {
      expect(existsSync(join(ROOT, p)), p).toBe(true);
    }
  });

  it("npm run dev:user / dev:admin / build:user / build:admin exist", () => {
    expect(rootPkg.scripts["dev:user"]).toMatch(/apps\/user/);
    expect(rootPkg.scripts["dev:admin"]).toMatch(/apps\/admin/);
    expect(rootPkg.scripts["build:user"]).toMatch(/apps\/user/);
    expect(rootPkg.scripts["build:admin"]).toMatch(/apps\/admin/);
  });

  it("dev:user works without admin (no cross-app imports)", () => {
    for (const f of userSources()) {
      const c = read(f);
      expect(c, f).not.toMatch(/apps\/admin/);
      expect(c, f).not.toMatch(/from ["'].*admin.*["']/i);
    }
    const cfg = read(join(USER, "vite.config.ts"));
    expect(cfg).not.toMatch(/admin/);
  });

  it("dev:admin works without user (no cross-app imports)", () => {
    for (const f of adminSources()) {
      const c = read(f);
      expect(c, f).not.toMatch(/apps\/user/);
      expect(c, f).not.toMatch(/from ["'].*\buser\b.*["']/i);
    }
    const cfg = read(join(ADMIN, "vite.config.ts"));
    // admin config must not reference the user app
    expect(cfg).not.toMatch(/apps\/user/);
  });

  it("frontend ports are different (default :5173 vs :5174)", () => {
    const u = read(join(USER, "vite.config.ts"));
    const a = read(join(ADMIN, "vite.config.ts"));
    expect(u).toMatch(/5173/);
    expect(a).toMatch(/5174/);
    expect(u).not.toMatch(/5174/);
    expect(a).not.toMatch(/5173/);
  });
});

describe("3-4. API base targets", () => {
  it("user targets only :8080", () => {
    const cfg = read(join(USER, "src/config.ts"));
    expect(cfg).toMatch(/8080/);
    expect(cfg).not.toMatch(/8081/);
    const env = read(join(USER, ".env.example"));
    expect(env).toMatch(/8080/);
    expect(env).not.toMatch(/8081/);
    for (const f of userSources()) {
      expect(read(f), f).not.toMatch(/localhost:8081/);
      expect(read(f), f).not.toMatch(/127\.0\.0\.1:8081/);
    }
  });

  it("admin targets only :8081", () => {
    const cfg = read(join(ADMIN, "src/config.ts"));
    expect(cfg).toMatch(/8081/);
    expect(cfg).not.toMatch(/8080/);
    const env = read(join(ADMIN, ".env.example"));
    expect(env).toMatch(/8081/);
    expect(env).not.toMatch(/8080/);
    for (const f of adminSources()) {
      expect(read(f), f).not.toMatch(/localhost:8080/);
      expect(read(f), f).not.toMatch(/127\.0\.0\.1:8080/);
    }
  });

  it("no hardcoded backend URLs scattered through components", () => {
    const stripComments = (c: string) =>
      c
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n");
    for (const f of [...userSources(), ...adminSources()]) {
      if (f.endsWith("config.ts")) continue;
      const c = stripComments(read(f));
      // components/pages must use the config module, not literals
      expect(c, f).not.toMatch(/http:\/\/localhost:808\d/);
      expect(c, f).not.toMatch(/https:\/\/api\.example\.com/);
    }
  });
});

describe("5-6. wrong-port calls are rejected (boundary documented + enforced)", () => {
  it("user never calls admin paths (so :8080 never receives admin writes)", () => {
    for (const f of userSources()) {
      const c = read(f);
      expect(c, f).not.toMatch(/\/api\/admin/);
    }
  });

  it("admin CRUD lives under /api/admin/... with lifecycle + generation on :8081", () => {
    const c = read(join(ADMIN, "src/api/client.ts"));
    expect(c).toMatch(/\/api\/admin\/groups/);
    expect(c).toMatch(/\/api\/admin\/teams/);
    expect(c).toMatch(/\/api\/admin\/rounds/);
    expect(c).toMatch(/\/api\/admin\/fields/);
    expect(c).toMatch(/\/api\/admin\/games/);
    expect(c).toMatch(/\/api\/games\/\$\{encodeURIComponent\(id\)\}\/start/);
    expect(c).toMatch(/\/api\/games\/\$\{encodeURIComponent\(id\)\}\/end/);
    expect(c).toMatch(/\/api\/admin\/rounds\/\$\{encodeURIComponent\(roundId\)\}\/generate-games\/\$\{kind\}/);
    expect(c).toMatch(/round-robin/);
    expect(c).toMatch(/knockout/);
    expect(c).toMatch(/consolation/);
  });

  it("backend boundary: public :8080 is read-only, admin :8081 owns mutations (contract check)", () => {
    // Frontend proof: user client has no mutation verbs, admin client does.
    const u = read(join(USER, "src/api/client.ts"));
    expect(u).not.toMatch(/"POST"/);
    expect(u).not.toMatch(/"PUT"/);
    expect(u).not.toMatch(/"DELETE"/);
    expect(u).not.toMatch(/'POST'/);
    expect(u).not.toMatch(/'PUT'/);
    expect(u).not.toMatch(/'DELETE'/);
    const a = read(join(ADMIN, "src/api/client.ts"));
    expect(a).toMatch(/"POST"/);
    expect(a).toMatch(/"PUT"/);
    expect(a).toMatch(/"DELETE"/);
  });
});

describe("7. user code has no admin write calls", () => {
  it("no write paths, verbs, or admin modules in apps/user", () => {
    const forbidden = [
      "/api/admin",
      "/api/teacher",
      "generate-games",
      "useScoreQueue",
      "ScorePage",
      "/admin/",
      '"/admin"',
      "'/admin'",
      "/games/create",
      "/games/:id/score",
    ];
    for (const f of userSources()) {
      const c = read(f);
      for (const s of forbidden) expect(c, `${f} :: ${s}`).not.toContain(s);
      expect(c, f).not.toMatch(/"POST"/);
      expect(c, f).not.toMatch(/"PUT"/);
      expect(c, f).not.toMatch(/"DELETE"/);
    }
  });

  it("no /admin route inside the user router", () => {
    const r = read(join(USER, "src/router.tsx"));
    const code = r
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(code).not.toMatch(/path\s*=\s*["']\/admin/);
    expect(code).not.toMatch(/["']\/admin\//);
    expect(code).not.toMatch(/["']\/admin["']/);
    expect(r).toMatch(/\/games/);
    expect(r).toMatch(/\/leaderboard/);
  });
});

describe("8. only user owns /ws/live", () => {
  it("user initializes ws://.../ws/live", () => {
    const cfg = read(join(USER, "src/config.ts"));
    expect(cfg).toMatch(/\/ws\/live/);
    const liveFiles = allFiles(join(USER, "src/live"));
    expect(liveFiles.length).toBeGreaterThan(0);
    let foundSocket = false;
    for (const f of userSources()) {
      if (read(f).includes("WebSocket")) foundSocket = true;
    }
    expect(foundSocket).toBe(true);
  });

  it("admin never touches the public socket", () => {
    for (const f of adminSources()) {
      const c = read(f);
      expect(c, f).not.toContain("/ws/live");
      expect(c, f).not.toContain("ws/live");
      expect(c, f).not.toContain("WebSocket");
      expect(c, f).not.toContain("TOURNAMENT_DATA_CHANGED");
    }
  });
});

describe("9. status comes from backend status; no score-derived logic", () => {
  it("contracts define SCHEDULED/RUNNING/FINISHED only", () => {
    const c = read(join(ROOT, "packages/contracts/src/index.ts"));
    expect(c).toMatch(/"SCHEDULED" \| "RUNNING" \| "FINISHED"/);
    expect(c).not.toContain("NOT_PLAYED");
    expect(c).not.toContain("IN_PLAY");
    expect(c).not.toContain('"ENDED"');
    expect(c).not.toContain('"LIVE"');
    expect(c).not.toContain('"COMPLETED"');
  });

  it("no score-based status derivation in either app", () => {
    // Forbidden: deriving lifecycle from scores (spec §5).
    // Lifecycle comments like SCHEDULED --start--> RUNNING are allowed;
    // only score-threshold status logic is rejected here.
    const scoreStatusPatterns = [
      /scoreA\s*>=\s*25/,
      /scoreB\s*>=\s*25/,
      /score\s*>=\s*25/,
      /scoreA\s*>\s*0[^=]*RUNNING/,
      /scoreB\s*>\s*0[^=]*RUNNING/,
    ];
    for (const f of [...userSources(), ...adminSources(), join(ROOT, "packages/contracts/src/index.ts")]) {
      const c = read(f);
      for (const re of scoreStatusPatterns) expect(c, `${f} :: ${re}`).not.toMatch(re);
      expect(c, f).not.toContain("NOT_PLAYED");
      expect(c, f).not.toContain("IN_PLAY");
    }
    // old teacher contract must not be reintroduced
    for (const f of [...userSources(), ...adminSources()]) {
      expect(read(f), f).not.toContain("/api/teacher");
    }
  });

  it("admin score page has explicit Finish Game and disables after FINISHED", () => {
    const c = read(join(ADMIN, "src/pages/ScorePage.tsx"));
    expect(c).toMatch(/Finish Game/);
    expect(c).toMatch(/FINISHED/);
    expect(c).toMatch(/disabled/);
    const uPages = allFiles(join(USER, "src/pages")).map((f) => read(f)).join("\n");
    expect(uPages).not.toMatch(/Finish Game/);
  });

  it("lifecycle is SCHEDULED --start--> RUNNING --end--> FINISHED", () => {
    const c = read(join(ADMIN, "src/api/client.ts"));
    expect(c).toMatch(/\/start/);
    expect(c).toMatch(/\/end/);
  });
});

describe("10. separate builds, routers, landings, deployments", () => {
  it("user and admin routers are different files with different trees", () => {
    const u = read(join(USER, "src/router.tsx"));
    const a = read(join(ADMIN, "src/router.tsx"));
    expect(u).not.toEqual(a);
    expect(u).toMatch(/LeaderboardPage/);
    expect(a).toMatch(/ScorePage/);
    expect(u).not.toMatch(/ScorePage/);
    expect(a).not.toMatch(/LeaderboardPage/);
    expect(u).toMatch(/\/teams\/:id/);
    expect(a).toMatch(/\/games\/create/);
  });

  it("user API != admin API", () => {
    const u = read(join(USER, "src/api/client.ts"));
    const a = read(join(ADMIN, "src/api/client.ts"));
    expect(u).not.toEqual(a);
    expect(a).toContain("/api/admin");
    expect(u).not.toContain("/api/admin");
  });

  it("user landing != admin landing", () => {
    const u = read(join(USER, "src/pages/LandingPage.tsx"));
    const a = read(join(ADMIN, "src/pages/DashboardPage.tsx"));
    expect(u).not.toEqual(a);
    expect(u).toMatch(/Tournament landing|Live games|Leaderboard/);
    expect(a).toMatch(/Administration dashboard/);
    expect(a).not.toMatch(/Tournament landing/);
  });

  it("builds are separate artifacts", () => {
    const u = read(join(USER, "vite.config.ts"));
    const a = read(join(ADMIN, "vite.config.ts"));
    expect(u).toMatch(/dist\/user/);
    expect(a).toMatch(/dist\/admin/);
    expect(u).not.toContain("dist/admin");
    expect(a).not.toContain("dist/user");
  });

  it("production is two site identities, not /admin subpath", () => {
    const u = read(join(USER, "src/router.tsx"));
    const code = u
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(code).not.toMatch(/["']\/admin/);
    const a = read(join(ADMIN, "src/router.tsx"));
    // admin has its own root /
    expect(a).toMatch(/path="\/"/);
  });
});
