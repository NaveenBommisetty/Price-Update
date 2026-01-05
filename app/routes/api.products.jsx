import { authenticate } from "../shopify.server";

const GET_PRODUCTS = `#graphql
{
  products(first: 50) {
    edges {
      node {
        id
        title
        handle
        status
        totalInventory

        hasOnlyDefaultVariant

        options {
          name
          values
        }

        images(first: 1) {
          nodes { url altText }
        }

        productCategory {
          productTaxonomyNode { fullName }
        }
      }
    }
  }
}
`;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function loader({ request }) {
  try {
    // ✅ Get admin + billing (billing is needed for FREE/PRO)
    const { admin, billing } = await authenticate.admin(request);

    // ✅ Check subscription
    // If subscription exists => PRO else FREE
    const { appSubscriptions } = await billing.check();
    const isPro = Boolean(appSubscriptions?.length);

    const plan = isPro ? "PRO" : "FREE";
    const maxSelectable = isPro ? 12 : 10;

    // ✅ Fetch products
    const response = await admin.graphql(GET_PRODUCTS);
    const result = await response.json();

    if (result?.errors?.length) {
      return jsonResponse(
        { ok: false, message: result.errors[0]?.message || "Failed to load products" },
        500
      );
    }

    const products = (result?.data?.products?.edges || []).map(({ node }) => node);

    // ✅ Return products + plan info
    return jsonResponse({
      ok: true,
      products,
      plan,
      maxSelectable,
    });
  } catch (e) {
    return jsonResponse(
      { ok: false, message: e?.message || "Failed to load products" },
      500
    );
  }
}
