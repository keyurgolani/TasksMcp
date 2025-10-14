/**
 * REST API domain index
 * Exports all REST API components
 */

export { RestServer } from './rest-server.js';
export type {
  RestServerConfig,
  OrchestratorDependencies,
} from './rest-server.js';

export * from './controllers/index.js';
export * from './routes/index.js';
