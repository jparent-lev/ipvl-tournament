// POST /api/save-state
// Écrit l'état du tournoi dans GitHub (fichier tournament-state.json)
// Body: { state: {...}, sha: "..." (optionnel pour update) }

const GITHUB_REPO  = "jparent-lev/ipvl-tournament";
const STATE_FILE   = "tournament-state.json";
const GITHUB_API   = `https://api.github.com/repos/${GITHUB_REPO}/contents/${STATE_FILE}`;

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const token = Netlify.env.get("GITHUB_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "GITHUB_TOKEN non configuré" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corps de requête invalide" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const { state, sha } = body;
  if (!state) {
    return new Response(JSON.stringify({ error: "state requis" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // Si on n'a pas le sha, on le récupère d'abord
  let currentSha = sha;
  if (!currentSha) {
    try {
      const getRes = await fetch(GITHUB_API, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "IPVL-Tournament",
        },
      });
      if (getRes.ok) {
        const getData = await getRes.json();
        currentSha = getData.sha;
      }
    } catch {}
  }

  const content = Buffer.from(JSON.stringify(state, null, 2)).toString("base64");

  const payload = {
    message: `Tournament state update — ${new Date().toISOString()}`,
    content,
    ...(currentSha ? { sha: currentSha } : {}),
  };

  try {
    const res = await fetch(GITHUB_API, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "IPVL-Tournament",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: `GitHub error: ${res.status}`, detail: errText }), {
        status: 502, headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, sha: data.content?.sha }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/save-state" };
