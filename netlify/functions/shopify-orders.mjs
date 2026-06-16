const SHOPIFY_STORE = "limoilouenvrac.com";
const SHOPIFY_API_VERSION = "2024-10";

const GLOBO_KEYS = {
  company:  "text-1",
  teamName: "text-2",
  player1:  "text-3",
  email1:   "text-4",
  player2:  "text-5",
  player3:  "text-6",
};

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

function orderToTeam(order) {
  const attrs = {};
  order.lineItems?.edges?.forEach(({ node: li }) => {
    li.customAttributes?.forEach(({ key, value }) => { attrs[key] = value; });
  });
  const firstName = order.customer?.firstName || "";
  const lastName  = order.customer?.lastName  || "";
  const customerName = [firstName, lastName].filter(Boolean).join(" ");

  return {
    id: order.id,
    shopifyOrderName: order.name,
    name:    attrs[GLOBO_KEYS.teamName] || attrs[GLOBO_KEYS.company] || `Équipe ${order.name}`,
    company: attrs[GLOBO_KEYS.company]  || "",
    captain: attrs[GLOBO_KEYS.player1]  || customerName || "",
    email:   attrs[GLOBO_KEYS.email1]   || order.customer?.defaultEmailAddress?.emailAddress || "",
    players: [
      attrs[GLOBO_KEYS.player1],
      attrs[GLOBO_KEYS.player2],
      attrs[GLOBO_KEYS.player3],
    ].filter(Boolean),
    fromShopify: true,
  };
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const token = Netlify.env.get("SHOPIFY_ADMIN_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "SHOPIFY_ADMIN_TOKEN not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let productId;
  try {
    const body = await req.json();
    productId = body.productId;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!productId) {
    return new Response(JSON.stringify({ error: "productId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const numericId = productId.toString().split("/").pop();
  const searchQuery = `product_id:${numericId} financial_status:paid`;

  try {
    const shopifyRes = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({
          query: ORDERS_QUERY,
          variables: { query: searchQuery },
        }),
      }
    );

    if (!shopifyRes.ok) {
      const text = await shopifyRes.text();
      return new Response(JSON.stringify({ error: `Shopify error: ${shopifyRes.status}`, detail: text }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await shopifyRes.json();
    const orders = data?.data?.orders?.edges?.map(({ node }) => node) || [];
    const teams = orders.map(orderToTeam);

    return new Response(JSON.stringify({ teams, total: teams.length }), {
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

export const config = {
  path: "/api/shopify-orders",
};
