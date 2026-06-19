import { useState, useEffect } from "react";
import { loadState, saveState } from "./store.js";

const GOLD = "#F5C842";
const BLACK = "#0D0D0D";
const BLACK_SOFT = "#1A1A1A";
const BLACK_MED = "#2A2A2A";
const BLACK_CARD = "#222222";

// ─── Utilitaires ────────────────────────────────────────────────────────────

function getAllTeams(state) {
  return [
    ...(state?.corporate?.teams || []).map(t => ({ ...t, classId: "corporate", classLabel: "Classe Corporative" })),
    ...(state?.general?.teams   || []).map(t => ({ ...t, classId: "general",   classLabel: "Classe Générale" })),
  ];
}

function getTeamMatches(state, teamId, classId) {
  const cls = state?.[classId];
  if (!cls) return [];
  const poolMatches = (cls.matches || []).filter(
    m => m.poolId && (m.teamA === teamId || m.teamB === teamId)
  );
  const bracketMatches = (cls.bracketMatches || []).filter(
    m => m.teamA === teamId || m.teamB === teamId
  );
  return [...poolMatches, ...bracketMatches];
}

function getTeam(state, teamId, classId) {
  return state?.[classId]?.teams?.find(t => t.id === teamId);
}

function getOpponent(state, match, teamId, classId) {
  const opId = match.teamA === teamId ? match.teamB : match.teamA;
  return getTeam(state, opId, classId);
}

function getMatchPhaseLabel(match) {
  if (match.poolId) return "Phase de poules";
  if (match.round)  return match.round;
  return "Match";
}

function getMatchResult(match, teamId) {
  if (!match.played) return null;
  const myScore    = match.teamA === teamId ? match.scoreA : match.scoreB;
  const theirScore = match.teamA === teamId ? match.scoreB : match.scoreA;
  if (match.forcedWinner) {
    return match.forcedWinner === teamId ? "win" : "loss";
  }
  return myScore > theirScore ? "win" : "loss";
}

// ─── Composants ─────────────────────────────────────────────────────────────

function PhaseChip({ match }) {
  const label = getMatchPhaseLabel(match);
  const isPool = !!match.poolId;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
      padding: "2px 8px", borderRadius: 20,
      background: isPool ? "rgba(245,200,66,0.15)" : "rgba(100,180,255,0.12)",
      color: isPool ? GOLD : "#7DC4FF",
    }}>{label.toUpperCase()}</span>
  );
}

function ResultBadge({ result }) {
  if (!result) return null;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      background: result === "win" ? "rgba(100,200,120,0.15)" : "rgba(220,80,80,0.12)",
      color: result === "win" ? "#5DBD78" : "#E05555",
    }}>{result === "win" ? "VICTOIRE" : "DÉFAITE"}</span>
  );
}

function MatchCard({ match, teamId, classId, state, onSaveScore, onDeclareWinner }) {
  const [scoreMe,   setScoreMe]   = useState("");
  const [scoreThem, setScoreThem] = useState("");
  const [showForce, setShowForce] = useState(false);

  const myScore    = match.teamA === teamId ? match.scoreA : match.scoreB;
  const theirScore = match.teamA === teamId ? match.scoreB : match.scoreA;
  const opponent   = getOpponent(state, match, teamId, classId);
  const result     = getMatchResult(match, teamId);
  const isMyTurn   = !match.played && match.teamA && match.teamB;
  const isTie      = match.played && !match.forcedWinner && myScore === theirScore;

  const valid = scoreMe !== "" && scoreThem !== "" &&
    Number(scoreMe) >= 0 && Number(scoreThem) >= 0;

  const inp = (val, set) => (
    <input
      type="number" min={0} max={11} value={val}
      onChange={e => set(e.target.value)}
      style={{
        width: 52, textAlign: "center", fontSize: 22, fontWeight: 700,
        background: BLACK_MED, border: `1.5px solid rgba(245,200,66,0.3)`,
        borderRadius: 8, color: "white", padding: "6px 0",
      }}
    />
  );

  return (
    <div style={{
      background: BLACK_CARD,
      border: `0.5px solid ${match.played ? (result === "win" ? "rgba(93,189,120,0.3)" : "rgba(224,85,85,0.25)") : "rgba(245,200,66,0.2)"}`,
      borderRadius: 14, overflow: "hidden", marginBottom: 12,
    }}>
      {/* En-tête */}
      <div style={{
        padding: "10px 16px", background: "rgba(245,200,66,0.07)",
        borderBottom: "0.5px solid rgba(245,200,66,0.1)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <PhaseChip match={match} />
        {match.played && <ResultBadge result={result} />}
        {!match.played && !match.teamB && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>En attente d'attribution</span>
        )}
      </div>

      <div style={{ padding: "16px" }}>
        {/* Adversaire */}
        <div style={{ marginBottom: 14, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>CONTRE</p>
          <p style={{ fontSize: 17, fontWeight: 600, color: opponent ? "white" : "rgba(255,255,255,0.3)" }}>
            {opponent?.name || "À déterminer"}
          </p>
        </div>

        {/* Score joué */}
        {match.played && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: match.forcedWinner ? 0 : 8 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: result === "win" ? GOLD : "rgba(255,255,255,0.4)" }}>{myScore}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Vous</div>
            </div>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.2)" }}>—</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: result === "loss" ? "#E05555" : "rgba(255,255,255,0.4)" }}>{theirScore}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{opponent?.name || "Adversaire"}</div>
            </div>
          </div>
        )}

        {match.forcedWinner && (
          <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
            Vainqueur déclaré — bris d'égalité
          </p>
        )}

        {/* Saisie score */}
        {isMyTurn && (
          <div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12, textAlign: "center" }}>
              Saisir le score final — capitaine de l'équipe gagnante
            </p>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ textAlign: "center" }}>
                {inp(scoreMe, setScoreMe)}
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Vous</p>
              </div>
              <div style={{ fontSize: 20, color: "rgba(255,255,255,0.2)", paddingBottom: 20 }}>—</div>
              <div style={{ textAlign: "center" }}>
                {inp(scoreThem, setScoreThem)}
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{opponent?.name || "Adversaire"}</p>
              </div>
            </div>
            <button
              onClick={() => valid && onSaveScore(match, Number(scoreMe), Number(scoreThem), teamId)}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none",
                background: valid ? GOLD : "rgba(255,255,255,0.08)",
                color: valid ? BLACK : "rgba(255,255,255,0.3)",
                fontSize: 14, fontWeight: 700, cursor: valid ? "pointer" : "default",
              }}
            >
              Confirmer le score
            </button>

            {/* Bris d'égalité */}
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <button
                onClick={() => setShowForce(!showForce)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
              >
                {showForce ? "Annuler" : "Déclarer un vainqueur (bris d'égalité)"}
              </button>
            </div>

            {showForce && (
              <div style={{ marginTop: 12, padding: 14, background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "0.5px solid rgba(255,255,255,0.1)" }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10, textAlign: "center" }}>
                  Quel équipe est déclarée vainqueure ?
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: teamId, name: "Votre équipe" },
                    { id: match.teamA === teamId ? match.teamB : match.teamA, name: opponent?.name || "Adversaire" },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { onDeclareWinner(match, opt.id, teamId); setShowForce(false); }}
                      style={{
                        flex: 1, padding: "10px 8px", borderRadius: 8,
                        background: "rgba(245,200,66,0.1)", border: `0.5px solid ${GOLD}`,
                        color: GOLD, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vue principale capitaine ────────────────────────────────────────────────

export default function CaptainView() {
  const [state, setStateLocal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTeam,  setSelectedTeam]  = useState(null);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [confirmed,     setConfirmed]     = useState(false);

  // Chargement initial
  useEffect(() => {
    loadState().then(saved => {
      if (saved?.tournament) setStateLocal(saved.tournament);
      setLoading(false);
    });
  }, []);

  // Polling toutes les 10s
  useEffect(() => {
    const interval = setInterval(() => {
      loadState().then(saved => {
        if (saved?.tournament) setStateLocal(saved.tournament);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Recharger au focus
  useEffect(() => {
    const onFocus = () => {
      loadState().then(saved => {
        if (saved?.tournament) setStateLocal(saved.tournament);
      });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const allTeams = getAllTeams(state);
  const filtered = allTeams.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.captain || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", background: BLACK, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 44, height: 44, background: GOLD, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: BLACK }}>V</span>
      </div>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Chargement…</p>
    </div>
  );

  async function saveScore(match, scoreMe, scoreThem, myTeamId) {
    const saved = await loadState();
    if (!saved?.tournament) return;
    const fresh = saved.tournament;
    const classId = selectedClass;
    const isMyTeamA = match.teamA === myTeamId;
    const scoreA = isMyTeamA ? scoreMe : scoreThem;
    const scoreB = isMyTeamA ? scoreThem : scoreMe;
    const isPool = !!match.poolId;

    if (isPool) {
      fresh[classId].matches = fresh[classId].matches.map(m =>
        m.id === match.id ? { ...m, scoreA, scoreB, played: true } : m
      );
    } else {
      fresh[classId].bracketMatches = propagateBracket(
        fresh[classId].bracketMatches, match.id, scoreA, scoreB
      );
    }

    await saveState({ ...saved, tournament: fresh });
    setStateLocal({ ...fresh });
  }

  async function declareWinner(match, winnerId, myTeamId) {
    const saved = await loadState();
    if (!saved?.tournament) return;
    const fresh = saved.tournament;
    const classId = selectedClass;
    const isPool = !!match.poolId;
    const scoreA = match.teamA === winnerId ? 1 : 0;
    const scoreB = match.teamB === winnerId ? 1 : 0;

    if (isPool) {
      fresh[classId].matches = fresh[classId].matches.map(m =>
        m.id === match.id ? { ...m, scoreA, scoreB, played: true, forcedWinner: winnerId } : m
      );
    } else {
      fresh[classId].bracketMatches = propagateBracket(
        fresh[classId].bracketMatches, match.id, scoreA, scoreB, winnerId
      );
    }

    await saveState({ ...saved, tournament: fresh });
    setStateLocal({ ...fresh });
  }

  function propagateBracket(bm, matchId, scoreA, scoreB, forcedWinner = null) {
    bm = bm.map(m => m.id === matchId
      ? { ...m, scoreA, scoreB, played: true, forcedWinner: forcedWinner || null }
      : m
    );
    const match = bm.find(m => m.id === matchId);
    if (!match) return bm;
    const winner = forcedWinner || (scoreA > scoreB ? match.teamA : match.teamB);
    const loser  = winner === match.teamA ? match.teamB : match.teamA;
    const prog = {
      Quarts: { w: "Demi-finales", l: null },
      "Demi-finales": { w: "Finale", l: "3e place" },
    }[match.round];
    if (!prog) return bm;
    const mIdx = bm.filter(m => m.bracket === match.bracket && m.round === match.round).findIndex(m => m.id === matchId);
    const nw = bm.filter(m => m.bracket === match.bracket && m.round === prog.w)[Math.floor(mIdx / 2)];
    const nl = prog.l ? bm.filter(m => m.bracket === match.bracket && m.round === prog.l)[0] : null;
    if (nw) { const sl = mIdx % 2 === 0 ? "teamA" : "teamB"; const i = bm.findIndex(m => m.id === nw.id); if (i >= 0) bm[i] = { ...bm[i], [sl]: winner }; }
    if (nl) { const sl = mIdx % 2 === 0 ? "teamA" : "teamB"; const i = bm.findIndex(m => m.id === nl.id); if (i >= 0) bm[i] = { ...bm[i], [sl]: loser }; }
    return bm;
  }

  const myMatches = selectedTeam && selectedClass
    ? getTeamMatches(state, selectedTeam.id, selectedClass)
    : [];

  const pendingCount = myMatches.filter(m => !m.played && m.teamA && m.teamB).length;
  const doneCount    = myMatches.filter(m => m.played).length;

  // ── Écran de sélection ──
  if (!confirmed) {
    return (
      <div style={{ minHeight: "100vh", background: BLACK, color: "white", fontFamily: "var(--font-sans, sans-serif)" }}>
        {/* Header */}
        <div style={{ background: BLACK_SOFT, borderBottom: "0.5px solid rgba(245,200,66,0.2)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: GOLD, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: BLACK }}>V</span>
          </div>
          <div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", margin: 0 }}>PRODUCTIONS LIMOILOU EN VRAC</p>
            <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "white" }}>IPVL 2026 — Espace capitaine</h1>
          </div>
        </div>

        <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px" }}>
          {!state || allTeams.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Le tournoi n'est pas encore configuré.</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Les matchs seront disponibles ici dès l'ouverture de la plateforme par l'administration.</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>Identifiez votre équipe</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
                Sélectionnez votre équipe pour accéder à vos matchs et saisir vos résultats.
              </p>

              {/* Recherche */}
              <input
                placeholder="Rechercher une équipe ou un capitaine…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 10,
                  background: BLACK_MED, border: "0.5px solid rgba(245,200,66,0.25)",
                  color: "white", fontSize: 14, marginBottom: 16, outline: "none",
                }}
              />

              {/* Liste des équipes */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map(team => (
                  <button
                    key={team.id}
                    onClick={() => { setSelectedTeam(team); setSelectedClass(team.classId); }}
                    style={{
                      background: selectedTeam?.id === team.id ? "rgba(245,200,66,0.12)" : BLACK_SOFT,
                      border: `0.5px solid ${selectedTeam?.id === team.id ? GOLD : "rgba(245,200,66,0.2)"}`,
                      borderRadius: 10, padding: "12px 14px", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 500, color: "white", margin: 0 }}>{team.name}</p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "3px 0 0" }}>
                          Cap. {team.captain || "—"} · {team.classLabel}
                        </p>
                      </div>
                      {selectedTeam?.id === team.id && (
                        <span style={{ color: GOLD, fontSize: 18 }}>✓</span>
                      )}
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, padding: "20px 0" }}>
                    Aucune équipe trouvée
                  </p>
                )}
              </div>

              {/* Confirmer */}
              {selectedTeam && (
                <div style={{ marginTop: 20, padding: "16px", background: "rgba(245,200,66,0.1)", border: `0.5px solid rgba(245,200,66,0.3)`, borderRadius: 12 }}>
                  <p style={{ fontSize: 14, color: "white", marginBottom: 4 }}>
                    Vous jouez pour <strong style={{ color: GOLD }}>{selectedTeam.name}</strong>
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>
                    {selectedTeam.classLabel} · Cap. {selectedTeam.captain}
                  </p>
                  <button
                    onClick={() => setConfirmed(true)}
                    style={{
                      width: "100%", padding: "13px", borderRadius: 10, border: "none",
                      background: GOLD, color: BLACK, fontSize: 15, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Accéder à mes matchs →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Écran des matchs ──
  return (
    <div style={{ minHeight: "100vh", background: BLACK, color: "white", fontFamily: "var(--font-sans, sans-serif)" }}>
      {/* Header */}
      <div style={{ background: BLACK_SOFT, borderBottom: "0.5px solid rgba(245,200,66,0.2)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => { setConfirmed(false); setSelectedTeam(null); }}
          style={{ background: "none", border: "none", color: GOLD, fontSize: 20, cursor: "pointer", padding: "0 8px 0 0", lineHeight: 1 }}
        >←</button>
        <div style={{ width: 32, height: 32, background: GOLD, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: BLACK }}>V</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", margin: 0 }}>CAPITAINE</p>
          <h1 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedTeam.name}</h1>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0 }}>{selectedTeam.classLabel}</p>
          <p style={{ fontSize: 12, color: pendingCount > 0 ? GOLD : "#5DBD78", margin: 0, fontWeight: 500 }}>
            {pendingCount > 0 ? `${pendingCount} à jouer` : `${doneCount} complétés`}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>
        {myMatches.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>📋</div>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Aucun match assigné pour l'instant.</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Vos matchs apparaîtront ici dès que les poules seront générées.</p>
          </div>
        ) : (
          <>
            {/* Stats rapides */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
              {[
                { label: "À jouer", value: pendingCount, color: GOLD },
                { label: "Victoires", value: myMatches.filter(m => m.played && getMatchResult(m, selectedTeam.id) === "win").length, color: "#5DBD78" },
                { label: "Défaites", value: myMatches.filter(m => m.played && getMatchResult(m, selectedTeam.id) === "loss").length, color: "#E05555" },
              ].map(s => (
                <div key={s.label} style={{ background: BLACK_SOFT, border: "0.5px solid rgba(245,200,66,0.12)", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Matchs à jouer en premier */}
            {myMatches.filter(m => !m.played && m.teamA && m.teamB).length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 600, color: GOLD, letterSpacing: "0.08em", marginBottom: 10 }}>MATCHS EN COURS</p>
                {myMatches.filter(m => !m.played && m.teamA && m.teamB).map(m => (
                  <MatchCard key={m.id} match={m} teamId={selectedTeam.id} classId={selectedClass} state={state}
                    onSaveScore={saveScore} onDeclareWinner={declareWinner} />
                ))}
              </>
            )}

            {/* Matchs en attente d'attribution */}
            {myMatches.filter(m => !m.played && (!m.teamA || !m.teamB)).length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 10, marginTop: 16 }}>EN ATTENTE D'ATTRIBUTION</p>
                {myMatches.filter(m => !m.played && (!m.teamA || !m.teamB)).map(m => (
                  <MatchCard key={m.id} match={m} teamId={selectedTeam.id} classId={selectedClass} state={state}
                    onSaveScore={saveScore} onDeclareWinner={declareWinner} />
                ))}
              </>
            )}

            {/* Matchs complétés */}
            {myMatches.filter(m => m.played).length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 10, marginTop: 16 }}>MATCHS COMPLÉTÉS</p>
                {myMatches.filter(m => m.played).map(m => (
                  <MatchCard key={m.id} match={m} teamId={selectedTeam.id} classId={selectedClass} state={state}
                    onSaveScore={saveScore} onDeclareWinner={declareWinner} />
                ))}
              </>
            )}
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 32 }}>
          Mise à jour automatique toutes les 15 secondes
        </p>
      </div>
    </div>
  );
}
