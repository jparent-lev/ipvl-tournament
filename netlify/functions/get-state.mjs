// GET /api/get-state
// Lit l'état du tournoi depuis GitHub (fichier tournament-state.json)

const GITHUB_REPO  = "jparent-lev/ipvl-tournament";
const STATE_FILE   = "tournament-state.json";
const GITHUB_API   = `https://api.github.com/repos/${GITHUB_REPO}/contents/${STATE_FILE}`;

export default async (req) => {
  const token = Netlify.env.get("GITHUB_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "GITHUB_TOKEN non configuré" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(GITHUB_API, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "IPVL-Tournament",
      },
    });

    if (res.status === 404) {
      // Fichier inexistant — retourner état vide
      return new Response(JSON.stringify({ state: null, sha: null }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `GitHub error: ${res.status}` }), {
        status: 502, headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));

    return new Response(JSON.stringify({ state: content, sha: data.sha }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/get-state" };
