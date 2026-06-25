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
  // Dernière mise à jour : 2026-06-25T10:48:11Z
  const TEAMS_DATA = {
    // Classe Générale — Variant 51321965510962
    "10214320767282": {
      inventory: 87,
      teams: [
        {
          id: "gid://shopify/Order/8869563236658",
          shopifyOrderName: "#5205",
          name: "Les boules aux fruits v.2",
          company: "",
          captain: "Céline Morin",
          email: "celine.morin@live.ca",
          players: ["Céline Morin", "Morris Morin-Robert", "Stéphanie Drouin"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8857177424178",
          shopifyOrderName: "#5204",
          name: "Les vlads",
          company: "",
          captain: "David lessard",
          email: "david-lessard@hotmail.com",
          players: ["David lessard", "Kevin guay", "Dany Laroselière"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8857164087602",
          shopifyOrderName: "#5203",
          name: "Les ch'tites chattes",
          company: "",
          captain: "Manon Szymczak",
          email: "szymczakmanon290791@gmail.com",
          players: ["Manon Szymczak", "Cloé", "Marie"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8853275148594",
          shopifyOrderName: "#5202",
          name: "Les petits coquins",
          company: "",
          captain: "Samuel Roy",
          email: "samuelroy_arq@hotmail.com",
          players: ["Samuel Roy", "Bernard Patry", "Camille Latourelle-Vigeant"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8839708574002",
          shopifyOrderName: "#5201",
          name: "Les Numidiens",
          company: "",
          captain: "Nadir Belkhiter",
          email: "nadir.belkhiter@ift.ulaval.ca",
          players: ["Nadir Belkhiter", "Mohamed Kesri", "Riad Boussoussa"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8839265222962",
          shopifyOrderName: "#5200",
          name: "Fennecs",
          company: "",
          captain: "Larbi A Yahia",
          email: "alarbi2000@hotmail.com",
          players: ["Larbi A Yahia", "Braham", "Ghalem"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8839005798706",
          shopifyOrderName: "#5199",
          name: "CFCMA Métiers d'art",
          company: "",
          captain: "Mélanie Denis",
          email: "meladenis@hotmail.com",
          players: ["Mélanie Denis", "Louis-Simon Pilote", "Marie-Sigrid Lefebvre Desgagnés"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8837913182514",
          shopifyOrderName: "#5198",
          name: "Les Machines à Boules",
          company: "",
          captain: "Nancy Tremblay",
          email: "nancybullit@yahoo.com",
          players: ["Nancy Tremblay", "Vanessa Giasson", "Annie Boutet"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8835742499122",
          shopifyOrderName: "#5196",
          name: "Les LouLou",
          company: "",
          captain: "Victor Langlois",
          email: "vic.langlois08@gmail.com",
          players: ["Victor Langlois", "Frédéric Julien", "Éric Martin"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8835432939826",
          shopifyOrderName: "#5195",
          name: "Fadas picoleurs",
          company: "",
          captain: "Guillaume Gignac",
          email: "guillaumefgignac@gmail.com",
          players: ["Guillaume Gignac", "Benjamin Piccarreta", "Adrien Maystre"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8834618982706",
          shopifyOrderName: "#5194",
          name: "Peaky boolers",
          company: "",
          captain: "Tristan Fasolino",
          email: "sylvainmichaud67@yahoo.fr",
          players: ["Tristan Fasolino", "Sylvain Michaud", "Maxime Jolivel"],
          fromShopify: true,
        },
        {
          id: "gid://shopify/Order/8834455732530",
          shopifyOrderName: "#5193",
          name: "Petanksteoika",
          company: "",
          captain: "Louis-Martin Guenette",
          email: "lmguen@gmail.com",
          players: ["Louis-Martin Guenette", "Francis Tanguay", "Marie-Ève Sirois"],
          fromShopify: true,
        },
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
      teams: [
        {
          id: "gid://shopify/Order/8837759271218",
          shopifyOrderName: "#5197",
          name: "MMAQ",
          company: "Maison des métiers d'art de Québec",
          captain: "Guy Langevin",
          email: "guy.langevin@mmaq.com",
          players: ["Guy Langevin", "Thierry Plante-Dubé", "Guillaume Demers"],
          fromShopify: true,
        },
      ]
    }
  };

  const classData = TEAMS_DATA[numericProductId] || { inventory: null, teams: [] };

  return new Response(JSON.stringify({ teams: classData.teams, total: classData.teams.length, inventory: classData.inventory }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/shopify-orders" };
