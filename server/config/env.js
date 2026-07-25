import dotenv from 'dotenv';

dotenv.config();

const missing = (key) => !process.env[key] || process.env[key].includes('your_') || process.env[key] === 'provider_endpoint_here';

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || '',
  llmApiKey: process.env.LLM_API_KEY || '',
  llmApiBaseUrl: process.env.LLM_API_BASE_URL || '',
  llmModel: process.env.LLM_MODEL || '',
  gbifBaseUrl: (process.env.GBIF_BASE_URL || 'https://api.gbif.org/v1').replace(/\/$/, ''),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development'
};

export function warnForMissingConfiguration() {
  if (missing('LLM_API_KEY') || missing('LLM_API_BASE_URL') || missing('LLM_MODEL')) {
    console.warn('⚠️  LLM_API_KEY is not set — dashboard runs in demo mode and AI card creation is disabled');
  }
  if (missing('MONGODB_URI')) {
    console.warn('⚠️  MONGODB_URI is not set — API will start, but capture and library routes require MongoDB Atlas');
  }
}

export const llmIsConfigured = () => Boolean(env.llmApiKey && env.llmApiBaseUrl && env.llmModel && !env.llmApiBaseUrl.includes('provider_endpoint_here'));
export const mongoIsConfigured = () => Boolean(env.mongoUri && !env.mongoUri.includes('your_mongodb'));
