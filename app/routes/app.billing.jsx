import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  InlineStack,
  BlockStack,
  Badge,
  Divider,
  Box,
  List,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";

/* =========================
   SERVER: billing check
========================= */
export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const { appSubscriptions } = await billing.check();

  return json({
    subscription: appSubscriptions?.[0] ?? null,
  });
};

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const { appSubscriptions } = await billing.check();

  await billing.cancel({
    subscriptionId: appSubscriptions?.[0]?.id,
  });

  return json({ success: true });
};

/* =========================
   CLIENT: UI
========================= */
export default function Billing() {
  const { subscription } = useLoaderData();
  const submit = useSubmit();

  useAppBridge();

  const isPaid = Boolean(subscription);
  const currentPlan = (subscription?.name || "Free").toLowerCase(); // "free" | "plus" | "pro"

  const openPlans = () => {
    window.top.location.href =
      "https://admin.shopify.com/store/send-or-ship/charges/ship-product-or-send-digital/pricing_plans";
  };

  // ✅ Plans (match your screenshot)
  const plans = [
    {
      key: "free",
      name: "Free",
      price: "₹0",
      subtitle: "Best for trying the app",
      limits: [
        "Up to 50 product status updates",
        "Up to 50 inventory updates",
        "Up to 50 decreasing price updates",
      ],
      cta: { label: "Select plan", onClick: openPlans },
    },
    {
      key: "plus",
      name: "Plus",
      price: "$3.99 / 30 days",
      subtitle: "For growing stores",
      limits: [
        "Up to 100 product status updates",
        "Up to 100 inventory updates",
        "Increase or decrease prices (up to 100)",
      ],
      cta: { label: "Upgrade to Plus", onClick: openPlans },
    },
    {
      key: "pro",
      name: "Pro",
      price: "$9.99 / 30 days",
      subtitle: "For high volume automation",
      limits: [
        "Unlimited product status updates",
        "Unlimited inventory updates",
        "Unlimited increase or decrease prices",
      ],
      cta: { label: "Upgrade to Pro", onClick: openPlans },
    },
  ];

  const currentPlanKey = currentPlan.includes("pro")
    ? "pro"
    : currentPlan.includes("plus")
    ? "plus"
    : "free";

  const currentPlanObj = plans.find((p) => p.key === currentPlanKey) || plans[0];

  return (
    <Page
      title="Plans & Billing"
      subtitle="Manage your subscription and usage limits"
      primaryAction={{
        content: currentPlanKey === "pro" ? "Manage billing" : "View plans",
        onAction: openPlans,
      }}
    >
      <Layout>
        {/* ✅ Current Plan Summary */}
        <Layout.Section>
          <Card>
            <Box padding="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Current plan
                  </Text>
                  <Text tone="subdued">
                    {isPaid
                      ? "Your subscription is active."
                      : "You are currently on the free plan."}
                  </Text>
                </BlockStack>

                <Badge tone={isPaid ? "success" : "attention"}>
                  {currentPlanObj.name}
                </Badge>
              </InlineStack>

              <Box paddingBlockStart="300">
                <Divider />
              </Box>

              <Box paddingBlockStart="300">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="p" variant="headingSm">
                      Plan benefits
                    </Text>
                    <Text as="p" tone="subdued">
                      {currentPlanObj.subtitle}
                    </Text>
                  </BlockStack>

                  <Text as="p" variant="headingMd">
                    {currentPlanObj.price}
                  </Text>
                </InlineStack>

                <Box paddingBlockStart="200">
                  <List type="bullet">
                    {currentPlanObj.limits.map((x) => (
                      <List.Item key={x}>{x}</List.Item>
                    ))}
                  </List>
                </Box>
              </Box>

              {/* ✅ Cancel only for paid users */}
              {isPaid ? (
                <>
                  <Box paddingBlockStart="300">
                    <Divider />
                  </Box>

                  <Box paddingBlockStart="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text tone="subdued">
                        You can cancel anytime. Your plan remains active until the billing period ends.
                      </Text>

                      <Button destructive onClick={() => submit({}, { method: "post" })}>
                        Cancel plan
                      </Button>
                    </InlineStack>
                  </Box>
                </>
              ) : null}
            </Box>
          </Card>
        </Layout.Section>

        {/* ✅ Plan Cards */}
        <Layout.Section>
          <InlineStack gap="400" wrap>
            {plans.map((p) => {
              const isCurrent = p.key === currentPlanKey;

              return (
                <div key={p.key} style={{ minWidth: 320, flex: "1 1 320px" }}>
                  <Card>
                    <Box padding="400">
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text as="h3" variant="headingMd">
                            {p.name}
                          </Text>
                          <Text tone="subdued">{p.subtitle}</Text>
                        </BlockStack>

                        {isCurrent ? (
                          <Badge tone="success">Current</Badge>
                        ) : (
                          <Badge tone="info">Available</Badge>
                        )}
                      </InlineStack>

                      <Box paddingBlockStart="200">
                        <Text as="p" variant="headingLg">
                          {p.price}
                        </Text>
                      </Box>

                      <Box paddingBlockStart="300">
                        <Divider />
                      </Box>

                      <Box paddingBlockStart="300">
                        <Text as="p" variant="headingSm">
                          Usage limits
                        </Text>
                        <Box paddingBlockStart="200">
                          <List type="bullet">
                            {p.limits.map((x) => (
                              <List.Item key={x}>{x}</List.Item>
                            ))}
                          </List>
                        </Box>
                      </Box>

                      <Box paddingBlockStart="300">
                        <Button
                          fullWidth
                          variant={isCurrent ? "secondary" : "primary"}
                          disabled={isCurrent}
                          onClick={p.cta.onClick}
                        >
                          {isCurrent ? "Selected" : p.cta.label}
                        </Button>

                        <Box paddingBlockStart="150">
                          <Text tone="subdued" alignment="center">
                            Opens Shopify billing
                          </Text>
                        </Box>
                      </Box>
                    </Box>
                  </Card>
                </div>
              );
            })}
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
