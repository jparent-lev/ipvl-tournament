// Fonction Netlify : proxy vers l'API Anthropic + MCP Shopify
// Filtre par variantId et retourne les équipes IPVL

const PRODUCT_TO_VARIANT = {
  "10214238290226": "51321615221042", // Corporative
  "10214320767282": "51321965510962", // Générale
};

const GLOBO_KEYS = {
  company:  "text-1",
  teamName: "text-2",
  player1:  "text-3",
  email1:   "text-4",
  player2:  "text-5",
  player3:  "text-6",
};

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY non configurée" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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
  const targetVariantId  = PRODUCT_TO_VARIANT[numericProductId];

  if (!targetVariantId) {
    return new Response(JSON.stringify({ error: `Produit inconnu: ${productId}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Requête GraphQL ciblée — tri par date décroissante, filtre sur le variant exact
  const query = `{
    orders(
      first: 50,
      sortKey: CREATED_AT,
      reverse: true,
      query: "financial_status:paid"
    ) {
      edges {
        node {
          id
          name
          displayFinancialStatus
          customer {
            firstName
            lastName
            defaultEmailAddress { emailAddress }
          }
          lineItems(first: 10) {
            edges {
              node {
                title
                variant { id }
                customAttributes { key value }
              }
            }
          }
        }
      }
    }
  }`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        mcp_servers: [{ type: "url", url: "https://setup.shopify.com/mcp", name: "shopify" }],
        messages: [{
          role: "user",
          content: `Exécute cette requête GraphQL sur le store Shopify limoilouenvrac.com et retourne le JSON brut complet sans aucun texte ni markdown :\n\n${query}`
        }],
      }),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Anthropic error: ${res.status}` }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json();

    // Extraire tout le contenu textuel et les tool results
    const allContent = (data.content || [])
      .map(b => {
        if (b.type === "text") return b.text;
        if (b.type === "tool_result" || b.type === "mcp_tool_result") {
          return Array.isArray(b.content)
            ? b.content.map(c => c.text || "").join("")
            : JSON.stringify(b.content);
        }
        return "";
      })
      .join("\n");

    // Parser le JSON des commandes depuis la réponse brute
    let orders = [];
    const jsonMatch = allContent.match(/\{[\s\S]*?"orders"[\s\S]*?\}\s*\}?\s*\}?/);
    if (jsonMatch) {
      try {
        // Trouver le JSON le plus complet possible
        let jsonStr = allContent;
        const start = allContent.indexOf('{"data"');
        const start2 = allContent.indexOf('{"orders"');
        if (start !== -1) jsonStr = allContent.slice(start);
        else if (start2 !== -1) jsonStr = allContent.slice(start2);

        // Trouver la fin du JSON
        let depth = 0, end = -1;
        for (let i = 0; i < jsonStr.length; i++) {
          if (jsonStr[i] === '{') depth++;
          else if (jsonStr[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
        }
        if (end > 0) jsonStr = jsonStr.slice(0, end);

        const parsed = JSON.parse(jsonStr);
        orders = parsed?.data?.orders?.edges?.map(e => e.node)
               || parsed?.orders?.edges?.map(e => e.node)
               || [];
      } catch { orders = []; }
    }

    // Filtrer par variantId et construire les équipes
    const gidVariant = `gid://shopify/ProductVariant/${targetVariantId}`;
    const teams = [];

    for (const order of orders) {
      for (const { node: li } of (order.lineItems?.edges || [])) {
        if (li.variant?.id !== gidVariant) continue;

        const attrs = {};
        (li.customAttributes || []).forEach(({ key, value }) => { attrs[key] = value; });

        // Ignorer les line items sans données Globo
        if (!attrs[GLOBO_KEYS.teamName] && !attrs[GLOBO_KEYS.player1] && !attrs[GLOBO_KEYS.company]) continue;

        const customerName = [order.customer?.firstName, order.customer?.lastName]
          .filter(Boolean).join(" ");

        teams.push({
          id: order.id,
          shopifyOrderName: order.name,
          name:    attrs[GLOBO_KEYS.teamName] || attrs[GLOBO_KEYS.company] || `Équipe ${order.name}`,
          company: attrs[GLOBO_KEYS.company]  || "",
          captain: attrs[GLOBO_KEYS.player1]  || customerName || "",
          email:   attrs[GLOBO_KEYS.email1]   || order.customer?.defaultEmailAddress?.emailAddress || "",
          players: [attrs[GLOBO_KEYS.player1], attrs[GLOBO_KEYS.player2], attrs[GLOBO_KEYS.player3]].filter(Boolean),
          fromShopify: true,
        });
        break; // Une seule équipe par commande
      }
    }

    return new Response(JSON.stringify({ teams, total: teams.length, debug_orders_found: orders.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/shopify-orders" };
