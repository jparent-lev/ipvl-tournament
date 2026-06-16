import { useState, useCallback, useEffect } from "react";

const GOLD = "#F5C842";
const GOLD_DARK = "#C9A020";
const GOLD_BG = "rgba(245,200,66,0.1)";
const GOLD_BG_STRONG = "rgba(245,200,66,0.18)";
const BLACK = "#0D0D0D";
const BLACK_SOFT = "#1A1A1A";
const BLACK_MED = "#2A2A2A";

// IDs Shopify des produits IPVL
const SHOPIFY_PRODUCTS = {
  corporate: {
    productId: "gid://shopify/Product/10214238290226",
    variantId: "gid://shopify/ProductVariant/51321615221042",
    label: "Classe Corporative",
    maxTeams: null,
    price: 300,
  },
  general: {
    productId: "gid://shopify/Product/10214320767282",
    variantId: "gid://shopify/ProductVariant/51321965510962",
    label: "Classe Générale",
    maxTeams: 96,
    price: 60,
  },
};

// Mapping des clés Globo Product Options → champs équipe
// Basé sur "Name on cart page" configuré dans Globo
const GLOBO_KEYS = {
  company:    "text-1", // Nom de l'entreprise
  teamName:   "text-2", // Nom de l'équipe
  player1:    "text-3", // Prénom et nom du Participant 1
  email1:     "text-4", // Courriel du Participant 1
  player2:    "text-5", // Prénom et nom Participant 2
  player3:    "text-6", // Prénom et nom Participant 3
};

// GraphQL query pour récupérer les commandes payées d'un produit
const ORDERS_QUERY = `
  query IPVLOrders($query: String!) {
    orders(first: 50, query: $query) {
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          customer {
            firstName
            lastName
            defaultEmailAddress { emailAddress }
          }
          lineItems(first: 5) {
            edges {
              node {
                title
                quantity
                variant { id }
                customAttributes { key value }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

// Appel au proxy Netlify → Shopify Admin API
async function fetchShopifyOrders(productId) {
  try {
    const response = await fetch("/api/shopify-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (!response.ok) {
      console.error("Shopify sync error:", response.status);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data.teams) ? data.teams : [];
  } catch (e) {
    console.error("Shopify fetch error:", e);
    return [];
  }
}

// Convertit une commande Shopify en objet équipe pour la plateforme
function shopifyOrderToTeam(order) {
  const attrs = {};
  const lineItem = order.lineItems?.edges?.[0]?.node;
  if (lineItem?.customAttributes) {
    lineItem.customAttributes.forEach(({ key, value }) => { attrs[key] = value; });
  }
  const firstName = order.customer?.firstName || "";
  const lastName = order.customer?.lastName || "";
  const customerName = [firstName, lastName].filter(Boolean).join(" ");

  return {
    id: order.id || order.name,
    shopifyOrderName: order.name,
    name: attrs[GLOBO_KEYS.teamName] || attrs[GLOBO_KEYS.company] || `Équipe ${order.name}`,
    company: attrs[GLOBO_KEYS.company] || "",
    captain: attrs[GLOBO_KEYS.player1] || customerName || "",
    email: attrs[GLOBO_KEYS.email1] || order.customer?.defaultEmailAddress?.emailAddress || "",
    players: [
      attrs[GLOBO_KEYS.player1],
      attrs[GLOBO_KEYS.player2],
      attrs[GLOBO_KEYS.player3],
    ].filter(Boolean),
    fromShopify: true,
  };
}

const CLASSES = {
  corporate: { id: "corporate", label: "Classe Corporative", maxTeams: null, endTime: "17h00" },
  general: { id: "general", label: "Classe Générale", maxTeams: 96, endTime: "18h00" },
};

const SCHEDULE = [
  { time: "12h00", label: "Accueil & logistique" },
  { time: "12h30", label: "Match 1" },
  { time: "13h10", label: "Match 2" },
  { time: "13h50", label: "Match 3" },
  { time: "14h30", label: "Pause & compilation" },
  { time: "14h50", label: "Quarts de finale" },
  { time: "15h30", label: "Demi-finales" },
  { time: "16h10", label: "Grandes finales & 3e place" },
  { time: "16h45", label: "Remise des prix" },
];

function generateId() { return Math.random().toString(36).slice(2, 9); }
function createPool(teams) { return { id: generateId(), teams: teams.map(t => t.id) }; }

function getPoolStandings(pool, teams, matches) {
  const stats = {};
  pool.teams.forEach(tid => { stats[tid] = { wins: 0, losses: 0, pf: 0, pa: 0 }; });
  matches.filter(m => m.poolId === pool.id && m.played).forEach(m => {
    const a = stats[m.teamA]; const b = stats[m.teamB];
    if (!a || !b) return;
    a.pf += m.scoreA; a.pa += m.scoreB; b.pf += m.scoreB; b.pa += m.scoreA;
    m.scoreA > m.scoreB ? (a.wins++, b.losses++) : (b.wins++, a.losses++);
  });
  return pool.teams
    .map(tid => ({ teamId: tid, team: teams.find(t => t.id === tid), ...stats[tid], diff: stats[tid].pf - stats[tid].pa }))
    .sort((a, b) => b.wins - a.wins || b.diff - a.diff);
}

function buildBracket(pools, teams, matches) {
  const competition = [], consolation = [];
  pools.forEach(pool => {
    const s = getPoolStandings(pool, teams, matches);
    if (s[0]) competition.push(s[0]); if (s[1]) competition.push(s[1]);
    if (s[2]) consolation.push(s[2]); if (s[3]) consolation.push(s[3]);
  });
  return { competition, consolation };
}

function Badge({ children, variant = "default" }) {
  const v = {
    default:  { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" },
    gold:     { bg: GOLD_BG_STRONG, color: GOLD_DARK },
    goldSolid:{ bg: GOLD, color: BLACK },
    success:  { bg: "rgba(100,200,120,0.15)", color: "#5DBD78" },
    warning:  { bg: GOLD_BG_STRONG, color: GOLD_DARK },
    danger:   { bg: "rgba(220,80,80,0.12)", color: "#E05555" },
    shopify:  { bg: "rgba(149,191,71,0.15)", color: "#85B83F" },
    comp:     { bg: GOLD_BG_STRONG, color: GOLD_DARK },
    cons:     { bg: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" },
  }[variant] || { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" };
  return (
    <span style={{ background: v.bg, color: v.color, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function ShopifyImportPanel({ classId, teams, onImport, onRefresh, loading, lastSync, inventory }) {
  const product = SHOPIFY_PRODUCTS[classId];
  const shopifyTeams = teams.filter(t => t.fromShopify);
  const manualTeams = teams.filter(t => !t.fromShopify);
  const spotsLeft = inventory !== null ? inventory : "—";

  return (
    <div style={{ background: GOLD_BG, border: `0.5px solid rgba(245,200,66,0.3)`, borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <svg width="14" height="16" viewBox="0 0 14 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M9.5 1.5C9.5 1.5 9.2 0.5 7 0.5C4.8 0.5 4.5 2 4.5 2L2 3L1 14.5L7 15.5L13 14.5L12 3L9.5 1.5Z" fill="#95BF47"/>
              <path d="M9.5 1.5L9 4.5L7 5L5 4.5L4.5 2" stroke="#5E8E3E" strokeWidth="0.5"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, color: GOLD }}>Synchronisation Shopify</span>
            <Badge variant="shopify">Globo Product Options</Badge>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0 }}>
            Produit : <span style={{ color: "rgba(255,255,255,0.7)" }}>{product.label}</span>
            {" · "}{product.price} $ CAD
            {" · "}<span style={{ color: spotsLeft < 5 ? "#E05555" : GOLD }}>{spotsLeft} places restantes</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {lastSync && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Sync : {lastSync}</span>}
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{ background: loading ? "transparent" : GOLD, color: loading ? GOLD : BLACK, border: loading ? `0.5px solid ${GOLD}` : "none", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Synchronisation…" : "Synchroniser ↻"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[
          { label: "Inscriptions Shopify", value: shopifyTeams.length, color: GOLD },
          { label: "Ajouts manuels", value: manualTeams.length, color: "rgba(255,255,255,0.6)" },
          { label: "Total équipes", value: teams.length, color: "white" },
        ].map(s => (
          <div key={s.label} style={{ background: BLACK_MED, borderRadius: 8, padding: "10px 12px", border: `0.5px solid rgba(245,200,66,0.15)` }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {shopifyTeams.length > 0 && (
        <div style={{ marginTop: 14, borderTop: `0.5px solid rgba(245,200,66,0.15)`, paddingTop: 12 }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8, letterSpacing: "0.05em" }}>ÉQUIPES IMPORTÉES</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {shopifyTeams.map(t => (
              <div key={t.id} style={{ background: BLACK_SOFT, border: `0.5px solid rgba(245,200,66,0.15)`, borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "white" }}>{t.name}</span>
                    {t.company && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{t.company}</span>}
                    <Badge variant="shopify">{t.shopifyOrderName}</Badge>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    Cap. {t.captain}{t.email ? ` · ${t.email}` : ""}
                    {t.players?.length > 1 && ` · ${t.players.length} joueurs`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {shopifyTeams.length === 0 && !loading && (
        <div style={{ marginTop: 12, padding: "12px", background: BLACK_SOFT, borderRadius: 8, border: `0.5px dashed rgba(245,200,66,0.2)`, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            Aucune inscription payée pour l'instant — les équipes apparaîtront automatiquement après chaque achat.
          </p>
        </div>
      )}
    </div>
  );
}

function ScoreInput({ match, teams, onSave }) {
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const teamA = teams.find(t => t.id === match.teamA);
  const teamB = teams.find(t => t.id === match.teamB);
  const valid = a !== "" && b !== "" && Number(a) >= 0 && Number(b) >= 0 && Number(a) !== Number(b);
  const inp = { width: 44, textAlign: "center", fontSize: 18, fontWeight: 500, background: BLACK_SOFT, border: `0.5px solid rgba(245,200,66,0.3)`, borderRadius: 6, color: "white", padding: "4px" };
  return (
    <div style={{ background: BLACK_MED, border: `0.5px solid rgba(245,200,66,0.2)`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.9)", textAlign: "right" }}>{teamA?.name || "—"}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="number" min={0} max={11} value={a} onChange={e => setA(e.target.value)} style={inp} />
        <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
        <input type="number" min={0} max={11} value={b} onChange={e => setB(e.target.value)} style={inp} />
      </div>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>{teamB?.name || "—"}</span>
      <button onClick={() => valid && onSave(Number(a), Number(b))}
        style={{ background: valid ? GOLD : "transparent", color: valid ? BLACK : "rgba(255,255,255,0.3)", border: valid ? "none" : `0.5px solid rgba(255,255,255,0.15)`, borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 500, cursor: valid ? "pointer" : "default", opacity: valid ? 1 : 0.4 }}>
        Confirmer
      </button>
    </div>
  );
}

function PoolCard({ pool, poolIndex, teams, matches, onSaveScore, phase }) {
  const standings = getPoolStandings(pool, teams, matches);
  const poolMatches = matches.filter(m => m.poolId === pool.id);
  const played = poolMatches.filter(m => m.played).length;
  return (
    <div style={{ background: BLACK_SOFT, border: `0.5px solid rgba(245,200,66,0.2)`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ background: GOLD_BG, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `0.5px solid rgba(245,200,66,0.15)` }}>
        <span style={{ fontWeight: 500, fontSize: 14, color: GOLD }}>Poule {poolIndex + 1}</span>
        <Badge variant={played === poolMatches.length ? "success" : "warning"}>{played}/{poolMatches.length} matchs</Badge>
      </div>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `0.5px solid rgba(255,255,255,0.07)` }}>
            {["Équipe", "V", "D", "+/-"].map((h, i) => (
              <th key={h} style={{ padding: i === 0 ? "8px 16px" : "8px", textAlign: i === 0 ? "left" : "center", fontWeight: 500, color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: "0.06em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.teamId} style={{ borderBottom: `0.5px solid rgba(255,255,255,0.05)`, background: i < 2 ? GOLD_BG : "transparent" }}>
              <td style={{ padding: "9px 16px", fontWeight: i < 2 ? 500 : 400 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i < 2 ? <Badge variant="comp">Compétition</Badge> : <Badge variant="cons">Consolante</Badge>}
                  <span style={{ color: i < 2 ? "white" : "rgba(255,255,255,0.55)" }}>{s.team?.name || s.teamId}</span>
                  {s.team?.fromShopify && <Badge variant="shopify">S</Badge>}
                </div>
              </td>
              <td style={{ padding: "9px 8px", textAlign: "center", color: "rgba(255,255,255,0.7)" }}>{s.wins}</td>
              <td style={{ padding: "9px 8px", textAlign: "center", color: "rgba(255,255,255,0.7)" }}>{s.losses}</td>
              <td style={{ padding: "9px 16px 9px 8px", textAlign: "center", fontWeight: 500, color: s.diff >= 0 ? GOLD : "#E05555" }}>{s.diff > 0 ? "+" : ""}{s.diff}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {phase === "pools" && (
        <div style={{ padding: "12px 16px", borderTop: `0.5px solid rgba(245,200,66,0.1)` }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 10px" }}>Saisie des scores — capitaine de l'équipe gagnante</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {poolMatches.filter(m => !m.played).map(m => (
              <ScoreInput key={m.id} match={m} teams={teams} onSave={(sA, sB) => onSaveScore(m.id, sA, sB)} />
            ))}
            {poolMatches.filter(m => !m.played).length === 0 && (
              <p style={{ fontSize: 13, color: GOLD, margin: 0 }}>✓ Tous les matchs de cette poule sont complétés.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BracketMatchCard({ match, teams, onSave, label }) {
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const teamA = teams.find(t => t.id === match?.teamA);
  const teamB = teams.find(t => t.id === match?.teamB);
  const valid = match?.teamA && match?.teamB && a !== "" && b !== "" && Number(a) !== Number(b);
  return (
    <div style={{ background: BLACK_SOFT, border: match?.played ? `0.5px solid ${GOLD}` : `0.5px solid rgba(245,200,66,0.2)`, borderRadius: 10, overflow: "hidden", minWidth: 200 }}>
      <div style={{ background: match?.played ? GOLD_BG_STRONG : GOLD_BG, padding: "5px 10px", borderBottom: `0.5px solid rgba(245,200,66,0.15)`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: match?.played ? GOLD : "rgba(255,255,255,0.4)" }}>{label}</span>
        {match?.played && <Badge variant="goldSolid">Joué</Badge>}
      </div>
      <div style={{ padding: "10px 12px" }}>
        {[{ team: teamA, score: match?.scoreA, other: match?.scoreB }, { team: teamB, score: match?.scoreB, other: match?.scoreA }].map(({ team, score, other }, idx) => {
          const won = match?.played && score > other;
          return (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: idx === 0 ? `0.5px solid rgba(255,255,255,0.07)` : "none" }}>
              <span style={{ fontSize: 13, fontWeight: won ? 500 : 400, color: team ? (won ? "white" : "rgba(255,255,255,0.5)") : "rgba(255,255,255,0.25)" }}>
                {team?.name || "À déterminer"}
              </span>
              {match?.played && <span style={{ fontSize: 16, fontWeight: 500, color: won ? GOLD : "rgba(255,255,255,0.3)" }}>{score}</span>}
            </div>
          );
        })}
        {!match?.played && match?.teamA && match?.teamB && (
          <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
            <input type="number" min={0} max={11} value={a} onChange={e => setA(e.target.value)} style={{ width: 40, textAlign: "center", fontSize: 14, background: BLACK_MED, border: `0.5px solid rgba(245,200,66,0.3)`, borderRadius: 5, color: "white", padding: "3px" }} />
            <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
            <input type="number" min={0} max={11} value={b} onChange={e => setB(e.target.value)} style={{ width: 40, textAlign: "center", fontSize: 14, background: BLACK_MED, border: `0.5px solid rgba(245,200,66,0.3)`, borderRadius: 5, color: "white", padding: "3px" }} />
            <button onClick={() => valid && onSave(match.id, Number(a), Number(b))}
              style={{ fontSize: 12, padding: "4px 10px", background: valid ? GOLD : "transparent", color: valid ? BLACK : "rgba(255,255,255,0.3)", border: "none", borderRadius: 5, fontWeight: 500, cursor: valid ? "pointer" : "default" }}>OK</button>
          </div>
        )}
      </div>
    </div>
  );
}

function EliminationBracket({ bracketMatches, teams, onSave, type }) {
  const rounds = ["Quarts", "Demi-finales", "Finale", "3e place"];
  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: type === "competition" ? GOLD : "rgba(255,255,255,0.7)" }}>
        Tableau {type === "competition" ? "Compétition" : "Consolante"}
      </h3>
      <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 8 }}>
        {rounds.map(round => {
          const rMatches = bracketMatches.filter(m => m.bracket === type && m.round === round);
          if (rMatches.length === 0 && round !== "Finale" && round !== "3e place") return null;
          return (
            <div key={round} style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 200 }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.35)", margin: "0 0 4px", letterSpacing: "0.06em" }}>{round.toUpperCase()}</p>
              {rMatches.length > 0 ? rMatches.map(m => (
                <BracketMatchCard key={m.id} match={m} teams={teams} onSave={onSave} label={round} />
              )) : (
                <div style={{ background: BLACK_MED, border: `0.5px dashed rgba(245,200,66,0.15)`, borderRadius: 10, padding: "24px 12px", textAlign: "center" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>À compléter</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DisplayBoard({ tournamentClass, teams, pools, matches, bracketMatches, phase }) {
  return (
    <div style={{ minHeight: "100vh", background: BLACK, color: "white", fontFamily: "var(--font-sans)", padding: "36px 48px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 48, height: 48, background: GOLD, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: BLACK }}>V</span>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>PRODUCTIONS LIMOILOU EN VRAC · IPVL 2026</div>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>{tournamentClass.label}</h1>
          </div>
        </div>
        <div style={{ background: GOLD, color: BLACK, padding: "8px 22px", borderRadius: 8, fontSize: 15, fontWeight: 700 }}>
          {phase === "pools" ? "PHASE DE POULES" : phase === "elimination" ? "PHASE ÉLIMINATOIRE" : "TOURNOI TERMINÉ"}
        </div>
      </div>

      {phase === "pools" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {pools.map((pool, i) => {
            const standings = getPoolStandings(pool, teams, matches);
            return (
              <div key={pool.id} style={{ background: BLACK_SOFT, border: `1px solid rgba(245,200,66,0.2)`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ background: GOLD_BG_STRONG, padding: "10px 18px", borderBottom: `1px solid rgba(245,200,66,0.15)` }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: GOLD }}>POULE {i + 1}</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {standings.map((s, rank) => (
                      <tr key={s.teamId} style={{ borderBottom: `0.5px solid rgba(255,255,255,0.06)`, background: rank < 2 ? GOLD_BG : "transparent" }}>
                        <td style={{ padding: "12px 18px", fontSize: 16, fontWeight: rank < 2 ? 600 : 400, color: rank < 2 ? "white" : "rgba(255,255,255,0.4)" }}>
                          {rank < 2 && <span style={{ color: GOLD, marginRight: 8 }}>▲</span>}{s.team?.name || s.teamId}
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{s.wins}V – {s.losses}D</td>
                        <td style={{ padding: "12px 18px", textAlign: "right", fontSize: 15, fontWeight: 700, color: s.diff >= 0 ? GOLD : "#E05555" }}>{s.diff > 0 ? "+" : ""}{s.diff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {phase === "elimination" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          {["competition", "consolation"].map(type => (
            <div key={type}>
              <div style={{ fontSize: 12, letterSpacing: "0.12em", color: type === "competition" ? GOLD : "rgba(255,255,255,0.35)", marginBottom: 16, fontWeight: 600 }}>
                {type === "competition" ? "TABLEAU COMPÉTITION" : "TABLEAU CONSOLANTE"}
              </div>
              <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
                {["Quarts", "Demi-finales", "Finale", "3e place"].map(round => {
                  const rMatches = bracketMatches.filter(m => m.bracket === type && m.round === round);
                  return (
                    <div key={round} style={{ minWidth: 170 }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8, letterSpacing: "0.05em" }}>{round.toUpperCase()}</div>
                      {rMatches.map(m => {
                        const tA = teams.find(t => t.id === m.teamA), tB = teams.find(t => t.id === m.teamB);
                        return (
                          <div key={m.id} style={{ background: BLACK_MED, border: `1px solid ${m.played ? GOLD : "rgba(245,200,66,0.15)"}`, borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                            {[{ t: tA, s: m.scoreA, os: m.scoreB }, { t: tB, s: m.scoreB, os: m.scoreA }].map(({ t, s, os }, idx) => {
                              const won = m.played && s > os;
                              return (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: idx === 0 ? `0.5px solid rgba(255,255,255,0.08)` : "none" }}>
                                  <span style={{ fontSize: 13, color: t ? (won ? "white" : "rgba(255,255,255,0.4)") : "rgba(255,255,255,0.2)" }}>{t?.name || "?"}</span>
                                  {m.played && <span style={{ fontSize: 15, fontWeight: 700, color: won ? GOLD : "rgba(255,255,255,0.3)" }}>{s}</span>}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                      {rMatches.length === 0 && (
                        <div style={{ background: BLACK_MED, border: `1px dashed rgba(245,200,66,0.1)`, borderRadius: 8, padding: "20px 12px", textAlign: "center", color: "rgba(255,255,255,0.15)", fontSize: 12 }}>—</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 40, paddingTop: 16, borderTop: `0.5px solid rgba(245,200,66,0.15)`, display: "flex", gap: 24, flexWrap: "wrap" }}>
        {SCHEDULE.map(s => (
          <div key={s.time} style={{ fontSize: 12 }}>
            <span style={{ color: GOLD, marginRight: 6, fontWeight: 500 }}>{s.time}</span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function generatePoolMatches(pools) {
  const matches = [];
  pools.forEach(pool => {
    const ts = pool.teams;
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
      matches.push({ id: generateId(), poolId: pool.id, teamA: ts[i], teamB: ts[j], scoreA: 0, scoreB: 0, played: false });
    }
  });
  return matches;
}

function generateBracketMatches(pools, teams, poolMatches) {
  const { competition, consolation } = buildBracket(pools, teams, poolMatches);
  const matches = [];
  ["competition", "consolation"].forEach(type => {
    const seeded = type === "competition" ? competition : consolation;
    for (let i = 0; i < Math.floor(seeded.length / 2); i++) {
      matches.push({ id: generateId(), bracket: type, round: "Quarts", teamA: seeded[i * 2]?.teamId || null, teamB: seeded[i * 2 + 1]?.teamId || null, scoreA: 0, scoreB: 0, played: false });
    }
    const sf1 = { id: generateId(), bracket: type, round: "Demi-finales", teamA: seeded[0]?.teamId || null, teamB: seeded[1]?.teamId || null, scoreA: 0, scoreB: 0, played: false };
    const sf2 = { id: generateId(), bracket: type, round: "Demi-finales", teamA: seeded[2]?.teamId || null, teamB: seeded[3]?.teamId || null, scoreA: 0, scoreB: 0, played: false };
    matches.push(sf1, sf2,
      { id: generateId(), bracket: type, round: "Finale", teamA: null, teamB: null, scoreA: 0, scoreB: 0, played: false },
      { id: generateId(), bracket: type, round: "3e place", teamA: null, teamB: null, scoreA: 0, scoreB: 0, played: false }
    );
  });
  return matches;
}

export default function App() {
  const [activeClass, setActiveClass] = useState("corporate");
  const [view, setView] = useState("admin");
  const [tab, setTab] = useState("teams");
  const [syncLoading, setSyncLoading] = useState({ corporate: false, general: false });
  const [lastSync, setLastSync] = useState({ corporate: null, general: null });
  const [inventory, setInventory] = useState({ corporate: 16, general: 96 });

  const [state, setState] = useState({
    corporate: { teams: [], pools: [], matches: [], bracketMatches: [], phase: "setup" },
    general:   { teams: [], pools: [], matches: [], bracketMatches: [], phase: "setup" },
  });

  const cls = state[activeClass];
  const tournamentClass = CLASSES[activeClass];
  const update = useCallback(fn => setState(prev => ({ ...prev, [activeClass]: fn(prev[activeClass]) })), [activeClass]);

  const syncShopify = useCallback(async (classId) => {
    setSyncLoading(prev => ({ ...prev, [classId]: true }));
    try {
      const shopifyTeams = await fetchShopifyOrders(SHOPIFY_PRODUCTS[classId].productId);

      setState(prev => {
        const existing = prev[classId].teams.filter(t => !t.fromShopify);
        // Déduplique par shopifyOrderName
        const existingIds = new Set(existing.map(t => t.shopifyOrderName).filter(Boolean));
        const newTeams = shopifyTeams.filter(t => !existingIds.has(t.shopifyOrderName));
        return { ...prev, [classId]: { ...prev[classId], teams: [...existing, ...newTeams] } };
      });

      const now = new Date().toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
      setLastSync(prev => ({ ...prev, [classId]: now }));
    } catch (e) {
      console.error("Sync error:", e);
    }
    setSyncLoading(prev => ({ ...prev, [classId]: false }));
  }, []);

  const addTeam = team => update(s => ({ ...s, teams: [...s.teams, { ...team, id: generateId(), fromShopify: false }] }));
  const removeTeam = id => update(s => ({ ...s, teams: s.teams.filter(t => t.id !== id) }));

  const generatePools = () => {
    if (cls.teams.length < 4) return alert("Minimum 4 équipes requises.");
    const shuffled = [...cls.teams].sort(() => Math.random() - 0.5);
    const pools = [];
    for (let i = 0; i < shuffled.length; i += 4) pools.push(createPool(shuffled.slice(i, i + 4)));
    update(s => ({ ...s, pools, matches: generatePoolMatches(pools), phase: "pools", bracketMatches: [] }));
    setTab("pools");
  };

  const savePoolScore = (matchId, scoreA, scoreB) =>
    update(s => ({ ...s, matches: s.matches.map(m => m.id === matchId ? { ...m, scoreA, scoreB, played: true } : m) }));

  const advanceToElimination = () => {
    update(s => ({ ...s, phase: "elimination", bracketMatches: generateBracketMatches(s.pools, s.teams, s.matches) }));
    setTab("bracket");
  };

  const saveBracketScore = (matchId, scoreA, scoreB) => {
    update(s => {
      let bm = s.bracketMatches.map(m => m.id === matchId ? { ...m, scoreA, scoreB, played: true } : m);
      const match = bm.find(m => m.id === matchId);
      if (!match) return { ...s, bracketMatches: bm };
      const winner = scoreA > scoreB ? match.teamA : match.teamB;
      const loser  = scoreA > scoreB ? match.teamB : match.teamA;
      const prog = { Quarts: { w: "Demi-finales", l: null }, "Demi-finales": { w: "Finale", l: "3e place" } }[match.round];
      if (!prog) return { ...s, bracketMatches: bm };
      const mIdx = bm.filter(m => m.bracket === match.bracket && m.round === match.round).findIndex(m => m.id === matchId);
      const nw = bm.filter(m => m.bracket === match.bracket && m.round === prog.w)[Math.floor(mIdx / 2)];
      const nl = prog.l ? bm.filter(m => m.bracket === match.bracket && m.round === prog.l)[0] : null;
      if (nw) { const sl = mIdx % 2 === 0 ? "teamA" : "teamB"; const i = bm.findIndex(m => m.id === nw.id); if (i >= 0) bm[i] = { ...bm[i], [sl]: winner }; }
      if (nl) { const sl = mIdx % 2 === 0 ? "teamA" : "teamB"; const i = bm.findIndex(m => m.id === nl.id); if (i >= 0) bm[i] = { ...bm[i], [sl]: loser }; }
      return { ...s, bracketMatches: bm };
    });
  };

  const allPoolsDone = cls.pools.length > 0 && cls.matches.filter(m => m.poolId).every(m => m.played);
  const tabStyle = active => ({
    padding: "8px 16px", fontSize: 13, fontWeight: active ? 500 : 400,
    color: active ? "white" : "rgba(255,255,255,0.4)",
    background: active ? BLACK_MED : "transparent",
    border: `0.5px solid ${active ? "rgba(245,200,66,0.3)" : "transparent"}`,
    borderRadius: "8px 8px 0 0", cursor: "pointer",
    borderBottom: active ? `0.5px solid ${BLACK_MED}` : `0.5px solid rgba(245,200,66,0.15)`,
    marginBottom: active ? -1 : 0, position: "relative", zIndex: active ? 1 : 0,
  });

  if (view === "display") return (
    <div style={{ background: BLACK, minHeight: "100vh" }}>
      <button onClick={() => setView("admin")} style={{ position: "fixed", top: 12, right: 12, zIndex: 100, background: "rgba(0,0,0,0.7)", color: GOLD, border: `0.5px solid ${GOLD}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>← Admin</button>
      <DisplayBoard tournamentClass={tournamentClass} teams={cls.teams} pools={cls.pools} matches={cls.matches} bracketMatches={cls.bracketMatches} phase={cls.phase} />
    </div>
  );

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 920, margin: "0 auto", padding: "24px 20px", background: BLACK, minHeight: "100vh", color: "white" }}>
      <h2 style={{ visibility: "hidden", position: "absolute" }}>Gestion du tournoi IPVL 2026</h2>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, background: GOLD, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: BLACK }}>V</span>
          </div>
          <div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: "0 0 2px", letterSpacing: "0.1em" }}>PRODUCTIONS LIMOILOU EN VRAC · IPVL 2026</p>
            <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Tableau de bord</h1>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.values(CLASSES).map(c => (
            <button key={c.id} onClick={() => setActiveClass(c.id)}
              style={{ background: activeClass === c.id ? GOLD : BLACK_MED, color: activeClass === c.id ? BLACK : "rgba(255,255,255,0.5)", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 13, fontWeight: activeClass === c.id ? 600 : 400, cursor: "pointer" }}>
              {c.label}
            </button>
          ))}
          <button onClick={() => setView("display")} style={{ background: "transparent", color: GOLD, border: `0.5px solid ${GOLD}`, borderRadius: 7, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            Grand écran ↗
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 28 }}>
        {[
          { label: "Équipes", value: cls.teams.length, max: tournamentClass.maxTeams },
          { label: "Shopify", value: cls.teams.filter(t => t.fromShopify).length, color: "#85B83F" },
          { label: "Matchs joués", value: cls.matches.filter(m => m.played).length },
          { label: "Phase", value: { setup: "Configuration", pools: "Poules", elimination: "Éliminatoire", done: "Terminé" }[cls.phase] },
        ].map(stat => (
          <div key={stat.label} style={{ background: BLACK_SOFT, border: `0.5px solid rgba(245,200,66,0.15)`, borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 5, letterSpacing: "0.05em" }}>{stat.label.toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: stat.color || "white" }}>
              {stat.value}{stat.max ? <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>/{stat.max}</span> : ""}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: `0.5px solid rgba(245,200,66,0.15)`, marginBottom: 20 }}>
        {[{ id: "teams", label: "Équipes" }, { id: "pools", label: "Poules", disabled: cls.phase === "setup" }, { id: "bracket", label: "Élimination", disabled: cls.phase !== "elimination" && cls.phase !== "done" }]
          .map(t => (
            <button key={t.id} onClick={() => !t.disabled && setTab(t.id)} style={{ ...tabStyle(tab === t.id), opacity: t.disabled ? 0.3 : 1, cursor: t.disabled ? "default" : "pointer" }}>
              {t.label}
            </button>
          ))}
      </div>

      {tab === "teams" && (
        <div>
          <ShopifyImportPanel
            classId={activeClass}
            teams={cls.teams}
            onRefresh={() => syncShopify(activeClass)}
            loading={syncLoading[activeClass]}
            lastSync={lastSync[activeClass]}
            inventory={inventory[activeClass]}
          />

          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 10px", letterSpacing: "0.05em" }}>AJOUT MANUEL</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["name", "captain"].map(field => (
                <input key={field} id={`manual-${field}`} placeholder={field === "name" ? "Nom de l'équipe" : "Capitaine (optionnel)"}
                  style={{ flex: 1, minWidth: 160, background: BLACK_MED, border: `0.5px solid rgba(245,200,66,0.25)`, borderRadius: 7, color: "white", padding: "8px 12px", fontSize: 13 }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      const name = document.getElementById("manual-name").value.trim();
                      const captain = document.getElementById("manual-captain").value.trim();
                      if (name) { addTeam({ name, captain }); document.getElementById("manual-name").value = ""; document.getElementById("manual-captain").value = ""; }
                    }
                  }} />
              ))}
              <button onClick={() => {
                const name = document.getElementById("manual-name").value.trim();
                const captain = document.getElementById("manual-captain").value.trim();
                if (name) { addTeam({ name, captain }); document.getElementById("manual-name").value = ""; document.getElementById("manual-captain").value = ""; }
              }} style={{ background: GOLD, color: BLACK, border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Ajouter
              </button>
            </div>
          </div>

          {cls.teams.filter(t => !t.fromShopify).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 16 }}>
              {cls.teams.filter(t => !t.fromShopify).map(t => (
                <div key={t.id} style={{ background: BLACK_MED, border: `0.5px solid rgba(245,200,66,0.2)`, borderRadius: 8, padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "white" }}>{t.name}</div>
                    {t.captain && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{t.captain}</div>}
                  </div>
                  <button onClick={() => removeTeam(t.id)} style={{ padding: "2px 7px", fontSize: 11, background: "transparent", border: `0.5px solid rgba(255,255,255,0.15)`, borderRadius: 4, color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {cls.teams.length >= 4 && cls.phase === "setup" && (
            <div style={{ padding: "16px", background: GOLD_BG, border: `0.5px solid rgba(245,200,66,0.3)`, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "white" }}>Prêt à générer les poules ?</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{cls.teams.length} équipes → {Math.ceil(cls.teams.length / 4)} poules de ~4 équipes</p>
              </div>
              <button onClick={generatePools} style={{ background: GOLD, color: BLACK, border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Générer les poules →
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "pools" && (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {cls.pools.map((pool, i) => (
              <PoolCard key={pool.id} pool={pool} poolIndex={i} teams={cls.teams} matches={cls.matches} onSaveScore={savePoolScore} phase={cls.phase} />
            ))}
          </div>
          {allPoolsDone && cls.phase === "pools" && (
            <div style={{ marginTop: 20, padding: "16px", background: GOLD_BG_STRONG, border: `0.5px solid rgba(245,200,66,0.4)`, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: GOLD }}>Phase de poules complétée !</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Les tableaux Compétition et Consolante sont prêts.</p>
              </div>
              <button onClick={advanceToElimination} style={{ background: GOLD, color: BLACK, border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Phase éliminatoire →
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "bracket" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <EliminationBracket bracketMatches={cls.bracketMatches} teams={cls.teams} onSave={saveBracketScore} type="competition" />
          <div style={{ borderTop: `0.5px solid rgba(245,200,66,0.15)`, paddingTop: 32 }}>
            <EliminationBracket bracketMatches={cls.bracketMatches} teams={cls.teams} onSave={saveBracketScore} type="consolation" />
          </div>
        </div>
      )}

      <div style={{ marginTop: 40, paddingTop: 16, borderTop: `0.5px solid rgba(245,200,66,0.1)`, fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
        IPVL 2026 — Plateforme de gestion de tournoi v1.2
      </div>
    </div>
  );
}
