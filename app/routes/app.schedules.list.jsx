import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Page,
  Card,
  Text,
  Badge,
  InlineStack,
  Box,
  Banner,
  IndexTable,
  Spinner,
  Divider,
  Button,
  Layout,
} from "@shopify/polaris";

function badgeTone(status) {
  if (status === "DONE") return "success";
  if (status === "FAILED") return "critical";
  if (status === "RUNNING") return "attention";
  return "info";
}

function fmt(val) {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleString();
  } catch {
    return String(val);
  }
}

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `$${v.toFixed(2)}`;
}

export default function SchedulesListPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ✅ selected schedule + details
  const [selectedId, setSelectedId] = useState("");
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [detailsErr, setDetailsErr] = useState("");
  const [details, setDetails] = useState(null); // schedule object
  const [items, setItems] = useState([]); // line items: old/new price

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/schedules/list?limit=50", {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load schedules");

      const list = Array.isArray(json.schedules) ? json.schedules : [];
      setSchedules(list);

      // keep selection valid
      if (selectedId && !list.some((s) => s.id === selectedId)) {
        setSelectedId("");
        setDetails(null);
        setItems([]);
      }
    } catch (e) {
      setErrorMsg(String(e?.message || e));
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const fetchScheduleDetails = useCallback(async (scheduleId) => {
    if (!scheduleId) return;

    setSelectedId(scheduleId);
    setDetailsBusy(true);
    setDetailsErr("");
    setDetails(null);
    setItems([]);

    try {
      // ✅ you need this endpoint
      const res = await fetch(`/api/schedules/details?id=${encodeURIComponent(scheduleId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || json?.message || "Failed to load schedule details");
      }

      setDetails(json.schedule || null);
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      setDetailsErr(String(e?.message || e));
      setDetails(null);
      setItems([]);
    } finally {
      setDetailsBusy(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const itemsSummary = useMemo(() => {
    if (!items.length) return null;
    const oldTotal = items.reduce((a, r) => a + (Number(r.oldPrice) || 0), 0);
    const newTotal = items.reduce((a, r) => a + (Number(r.newPrice) || 0), 0);
    const diff = newTotal - oldTotal;
    return { oldTotal, newTotal, diff };
  }, [items]);

  return (
    <Page
      title="Schedule list"
      subtitle="Bulk price update schedules"
      backAction={{
        content: "Price update",
        onAction: () => window.history.back(),
      }}
      primaryAction={{
        content: "Refresh",
        onAction: fetchSchedules,
        loading,
      }}
    >
      {errorMsg ? (
        <Box paddingBlockEnd="300">
          <Banner tone="critical" title="Unable to load schedules">
            <p>{errorMsg}</p>
          </Banner>
        </Box>
      ) : null}

      <Layout>
        {/* LEFT: schedule list */}
        <Layout.Section>
          <Card>
            <Box padding="0">
              {loading ? (
                <Box padding="400">
                  <InlineStack gap="200" align="center">
                    <Spinner size="small" />
                    <Text as="span" tone="subdued">
                      Loading schedules…
                    </Text>
                  </InlineStack>
                </Box>
              ) : schedules.length === 0 ? (
                <Box padding="400">
                  <Text tone="subdued">No schedules found.</Text>
                </Box>
              ) : (
                <IndexTable
                  resourceName={{ singular: "schedule", plural: "schedules" }}
                  itemCount={schedules.length}
                  selectable={false}
                  headings={[
                    { title: "Schedule ID" },
                    { title: "Status" },
                    { title: "Run at" },
                    { title: "Created at" },
                    { title: "Products" },
                    { title: "Items" },
                    { title: "Action" },
                  ]}
                >
                  {schedules.map((s, index) => {
                    const isActive = s.id === selectedId;

                    return (
                      <IndexTable.Row id={s.id} key={s.id} position={index}>
                        <IndexTable.Cell>
                          <Text as="span" variant="bodySm" fontWeight="medium">
                            {s.id}
                          </Text>
                        </IndexTable.Cell>

                        <IndexTable.Cell>
                          <Badge tone={badgeTone(s.status)}>{s.status}</Badge>
                        </IndexTable.Cell>

                        <IndexTable.Cell>
                          <Text as="span" tone="subdued">
                            {fmt(s.runAt)}
                          </Text>
                        </IndexTable.Cell>

                        <IndexTable.Cell>
                          <Text as="span" tone="subdued">
                            {fmt(s.createdAt)}
                          </Text>
                        </IndexTable.Cell>

                        <IndexTable.Cell>{s.productCount ?? "—"}</IndexTable.Cell>
                        <IndexTable.Cell>{s.itemCount ?? "—"}</IndexTable.Cell>

                        <IndexTable.Cell>
                          <Button
                            size="micro"
                            variant={isActive ? "primary" : "secondary"}
                            onClick={() => fetchScheduleDetails(s.id)}
                          >
                            {isActive ? "Viewing" : "View"}
                          </Button>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    );
                  })}
                </IndexTable>
              )}
            </Box>
          </Card>
        </Layout.Section>

        {/* RIGHT: details panel */}
        <Layout.Section variant="oneThird">
          <Card>
            <Box padding="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Schedule details
                </Text>

                {selectedId ? (
                  <Badge tone="info">ID: {selectedId}</Badge>
                ) : (
                  <Badge tone="subdued">Select a schedule</Badge>
                )}
              </InlineStack>

              <Box paddingBlockStart="300">
                <Divider />
              </Box>

              {!selectedId ? (
                <Box paddingBlockStart="300">
                  <Text tone="subdued">
                    Click <b>View</b> on a schedule to see products and price changes.
                  </Text>
                </Box>
              ) : detailsBusy ? (
                <Box paddingBlockStart="300">
                  <InlineStack gap="200" blockAlign="center">
                    <Spinner size="small" />
                    <Text as="span" tone="subdued">
                      Loading details…
                    </Text>
                  </InlineStack>
                </Box>
              ) : detailsErr ? (
                <Box paddingBlockStart="300">
                  <Banner tone="critical" title="Unable to load details">
                    <p>{detailsErr}</p>
                  </Banner>
                </Box>
              ) : (
                <>
                  <Box paddingBlockStart="300">
                    <InlineStack gap="200" blockAlign="center">
                      <Text tone="subdued">Status:</Text>
                      <Badge tone={badgeTone(details?.status)}>{details?.status ?? "—"}</Badge>
                    </InlineStack>

                    <Box paddingBlockStart="200">
                      <Text tone="subdued">
                        Run at: <b>{fmt(details?.runAt)}</b>
                      </Text>
                      <Text tone="subdued">
                        Created at: <b>{fmt(details?.createdAt)}</b>
                      </Text>
                    </Box>

                    {details?.error ? (
                      <Box paddingBlockStart="200">
                        <Banner tone="critical" title="Schedule error">
                          <p>{details.error}</p>
                        </Banner>
                      </Box>
                    ) : null}
                  </Box>

                  <Box paddingBlockStart="300">
                    <Divider />
                  </Box>

                  <Box paddingBlockStart="300">
                    <Text as="h3" variant="headingSm">
                      Price changes
                    </Text>
                    <Text tone="subdued">Old price → New price (variants)</Text>
                  </Box>

                  {itemsSummary ? (
                    <Box paddingBlockStart="200">
                      <Text as="p" tone="subdued">
                        Total old: <b>{money(itemsSummary.oldTotal)}</b>
                      </Text>
                      <Text as="p" tone="subdued">
                        Total new: <b>{money(itemsSummary.newTotal)}</b>
                      </Text>
                      <Text as="p" tone={itemsSummary.diff >= 0 ? "success" : "critical"}>
                        Difference: <b>{money(itemsSummary.diff)}</b>
                      </Text>
                    </Box>
                  ) : null}

                  <Box paddingBlockStart="200">
                    {!items.length ? (
                      <Text tone="subdued">No item details available for this schedule.</Text>
                    ) : (
                      <IndexTable
                        resourceName={{ singular: "item", plural: "items" }}
                        itemCount={Math.min(items.length, 50)}
                        selectable={false}
                        headings={[
                          { title: "Product" },
                          { title: "Variant" },
                          { title: "Old" },
                          { title: "New" },
                        ]}
                      >
                        {items.slice(0, 50).map((it, idx) => (
                          <IndexTable.Row id={`${idx}`} key={`${idx}`} position={idx}>
                            <IndexTable.Cell>
                              <Text as="span" variant="bodySm">
                                {it.productTitle || "—"}
                              </Text>
                              {it.sku ? (
                                <Text as="p" tone="subdued" variant="bodySm">
                                  SKU: {it.sku}
                                </Text>
                              ) : null}
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              <Text as="span" tone="subdued" variant="bodySm">
                                {it.variantTitle || "—"}
                              </Text>
                            </IndexTable.Cell>

                            <IndexTable.Cell>{money(it.oldPrice)}</IndexTable.Cell>
                            <IndexTable.Cell>{money(it.newPrice)}</IndexTable.Cell>
                          </IndexTable.Row>
                        ))}
                      </IndexTable>
                    )}

                    {items.length > 50 ? (
                      <Box paddingBlockStart="200">
                        <Text tone="subdued">
                          Showing 50 of {items.length} items. (You can add pagination later.)
                        </Text>
                      </Box>
                    ) : null}
                  </Box>
                </>
              )}
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
