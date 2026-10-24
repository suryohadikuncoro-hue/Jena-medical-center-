function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  supabaseUrl: required("SUPABASE_URL"),
  supabasePublishableKey: required("SUPABASE_PUBLISHABLE_KEY"),
};

export function configureRuntimeEnv(values: {
  databaseUrl?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
}) {
  if (values.databaseUrl) env.databaseUrl = values.databaseUrl;
  if (values.supabaseUrl) env.supabaseUrl = values.supabaseUrl;
  if (values.supabasePublishableKey) env.supabasePublishableKey = values.supabasePublishableKey;
}
