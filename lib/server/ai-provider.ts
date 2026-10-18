const OPENAI_BASE_URL = "https://api.openai.com/v1";
const VERCEL_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";

export function getAiProvider() {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  // Vercel rotates its OIDC token at runtime. Ignore a copied .env.local token
  // during `next dev`; it may be stale, so local development needs an API key.
  const vercelOidcToken = process.env.NODE_ENV === "production" && process.env.VERCEL === "1"
    ? process.env.VERCEL_OIDC_TOKEN?.trim()
    : undefined;
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const gatewayCredential = gatewayKey || vercelOidcToken;
  const throughGateway = Boolean(gatewayCredential);
  const apiKey = gatewayCredential || openAiKey || "";

  return {
    apiKey,
    baseUrl: throughGateway ? VERCEL_GATEWAY_BASE_URL : OPENAI_BASE_URL,
    configured: Boolean(apiKey),
    throughGateway,
    model(configuredModel: string | undefined, openAiDefault: string) {
      const model = configuredModel?.trim() || openAiDefault;
      return throughGateway && !model.includes("/") ? `openai/${model}` : model;
    },
  };
}
