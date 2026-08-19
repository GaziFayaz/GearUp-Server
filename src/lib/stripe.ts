import Stripe from "stripe";
import config from "../config/index.js";

const apiKey = config.stripe_secret_key || "sk_test_placeholder";

export const stripe = new Stripe(apiKey, {
  apiVersion: "2025-02-24.acacia" as any,
  typescript: true,
});

export const isStripeConfigured = () => {
  return (
    !!config.stripe_secret_key &&
    config.stripe_secret_key !== "sk_test_placeholder" &&
    !config.stripe_secret_key.includes("placeholder")
  );
};
