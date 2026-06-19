// Fonction Netlify : retourne les équipes IPVL depuis Shopify
// Architecture : données injectées directement par Claude via git push
// Les données sont mises à jour à chaque synchronisation depuis Claude

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  let productId;
  try {
    const body = await req.json();
    productId = body.productId;
  } catch {
    return new Response(JSON.stringify({ error: "Corps de requête invalide" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const numericProductId = productId?.toString().split("/").pop();

  // Données IPVL extraites directement depuis Shopify par Claude
  // Dernière mise à jour : 2026-06-18T23:55:54Z
  const TEAMS_DATA = {
    // Classe Générale — Variant 51321965510962
    "10214320767282": {
      inventory: 95,
      teams: [
        {
          id: "gid://shopify/Order/8830845157682",
          shopifyOrderName: "#5183",
          name: "Les excentriques",
          company: "",
          captain: "Laurence Paradis",
          email: "Laurence.paradis@outlook.com",
          players: ["Laurence Paradis", "Denis Boutin", "Julien Second"],
          fromShopify: true,
        }
      ]
    },
    // Classe Corporative — Variant 51321615221042
    "10214238290226": {
      inventory: 16,
      teams: []
    }
  };

  const classData = TEAMS_DATA[numericProductId] || { inventory: null, teams: [] };

  return new Response(JSON.stringify({ teams: classData.teams, total: classData.teams.length, inventory: classData.inventory }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/shopify-orders" };
