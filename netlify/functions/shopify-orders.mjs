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
  // Dernière mise à jour : 2026-06-20T15:10:00Z
  const TEAMS_DATA = {
    // Classe Générale — Variant 51321965510962
    "10214320767282": {
      inventory: 87,
      teams: [
        {
          id: "gid://shopify/Order/8832809304370",
          shopifyOrderName: "#5192",
          name: "Touquaille",
          company: "",
          captain: "Marie-Christine LeBel",
          email: "mchristine123@hotmail.com",
          players: ["Marie-Christine LeBel", "Hugo Lamarre", "Étienne Lamarre"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8832785580338",
          shopifyOrderName: "#5191",
          name: "Les Pastagas",
          company: "",
          captain: "Philip Bardou",
          email: "philipbardou@msn.com",
          players: ["Philip Bardou", "Frédéric Maugourd", "Jérôme Messant"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8832399769906",
          shopifyOrderName: "#5190",
          name: "Springbrook Boules",
          company: "",
          captain: "John Reid",
          email: "eighthurley@gmail.com",
          players: ["John Reid", "JoAnn Miller-Reid", "Claire Rancourt"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8832131301682",
          shopifyOrderName: "#5188",
          name: "Les Ballerines",
          company: "",
          captain: "Herminio Montoni",
          email: "hcmontoni@gmail.com",
          players: ["Herminio Montoni", "Geraldiny dos Santos", "Sarah Dumais"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8832073138482",
          shopifyOrderName: "#5187",
          name: "Shooting Stars",
          company: "",
          captain: "Simon Lavoie",
          email: "lil_simon@msn.com",
          players: ["Simon Lavoie", "Edson Belhumeur", "Martin Turcotte"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8831931646258",
          shopifyOrderName: "#5186",
          name: "Les Inspecteurs de boules",
          company: "",
          captain: "Antoni Soldevila",
          email: "antoni.soldevila@hotmail.com",
          players: ["Antoni Soldevila", "Benoit Fortier", "Thomas Richer"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8831814762802",
          shopifyOrderName: "#5185",
          name: "Les Héliceurs",
          company: "",
          captain: "Carl Campeau",
          email: "carl.campeau@hotmail.com",
          players: ["Carl Campeau", "Jérémy Gauthier", "Simon Roy-Dubois"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8831674057010",
          shopifyOrderName: "#5184",
          name: "Les Pétanque Or",
          company: "",
          captain: "Grégory Avenet",
          email: "gravenet@gmail.com",
          players: ["Grégory Avenet", "Steve Moreau", "Line Nault"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8830845157682",
          shopifyOrderName: "#5183",
          name: "Les excentriques",
          company: "",
          captain: "Laurence Paradis",
          email: "Laurence.paradis@outlook.com",
          players: ["Laurence Paradis", "Denis Boutin", "Julien Second"],
          fromShopify: true,
        },
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
