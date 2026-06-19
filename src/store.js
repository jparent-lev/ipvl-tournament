// store.js — Store partagé via GitHub (multi-appareils)
// Utilisé par App.jsx (admin) et CaptainView.jsx (capitaines)

let _sha = null; // SHA du fichier GitHub courant

export async function loadState() {
  try {
    const res = await fetch("/api/get-state", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    _sha = data.sha;
    return data.state;
  } catch {
    return null;
  }
}

export async function saveState(state) {
  try {
    const res = await fetch("/api/save-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, sha: _sha }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.sha) _sha = data.sha;
    return true;
  } catch {
    return false;
  }
}
