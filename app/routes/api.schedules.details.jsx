import prisma from "../db.server";
import { authenticate } from "../shopify.server";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Batch fetch variant info by ids using Shopify GraphQL
const VARIANTS_BY_IDS = `#graphql
  query VariantsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        title
        sku
        product {
          title
        }
      }
    }
  }
`;

export async function loader({ request }) {
  try {
    const { session, admin } = await authenticate.admin(request);

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return jsonResponse({ ok: false, error: "Missing schedule id" }, 400);

    // ✅ read schedule owned by this shop
    const row = await prisma.priceSchedule.findFirst({
      where: { id, shop: session.shop },
      select: {
        id: true,
        createdAt: true,
        runAt: true,
        revertAt: true,
        status: true,
        error: true,
        payload: true,
      },
    });

    if (!row) return jsonResponse({ ok: false, error: "Schedule not found" }, 404);

    const payload = row.payload || {};
    const rawItems = Array.isArray(payload?.items) ? payload.items : [];

    // Normalize items from payload
    // Your payload items look like: { variantId, newPrice, oldPrice }
    const itemsBase = rawItems
      .map((it) => ({
        variantId: it?.variantId || it?.id || null,
        oldPrice: it?.oldPrice ?? null,
        newPrice: it?.newPrice ?? null,
      }))
      .filter((x) => x.variantId);

    const variantIds = Array.from(new Set(itemsBase.map((x) => String(x.variantId))));

    // ✅ fetch product/variant names & sku from Shopify
    let variantMap = new Map();
    if (variantIds.length) {
      const resp = await admin.graphql(VARIANTS_BY_IDS, {
        variables: { ids: variantIds },
      });

      const data = await resp.json();
      const nodes = Array.isArray(data?.data?.nodes) ? data.data.nodes : [];

      variantMap = new Map(
        nodes
          .filter(Boolean)
          .map((v) => [
            v.id,
            {
              productTitle: v?.product?.title || "—",
              variantTitle: v?.title || "—",
              sku: v?.sku || "",
            },
          ])
      );
    }

    const items = itemsBase.map((it) => {
      const info = variantMap.get(String(it.variantId)) || {};
      return {
        variantId: String(it.variantId),
        productTitle: info.productTitle || "—",
        variantTitle: info.variantTitle || "—",
        sku: info.sku || "",
        oldPrice: it.oldPrice,
        newPrice: it.newPrice,
      };
    });

    const schedule = {
      id: row.id,
      createdAt: row.createdAt,
      runAt: row.runAt,
      revertAt: row.revertAt,
      status: row.status,
      error: row.error,
      productCount: Array.isArray(payload?.productIds) ? payload.productIds.length : 0,
      itemCount: items.length,
      changeMode: payload?.schedule?.changeMode || null,
    };

    return jsonResponse({ ok: true, schedule, items });
  } catch (e) {
    return jsonResponse(
      {
        ok: false,
        error: "Failed to load schedule details",
        details: String(e?.message || e),
      },
      500
    );
  }
}
