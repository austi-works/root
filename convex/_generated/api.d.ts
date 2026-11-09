/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as marketing_access from "../marketing/access.js";
import type * as marketing_ai from "../marketing/ai.js";
import type * as marketing_analytics from "../marketing/analytics.js";
import type * as marketing_campaigns from "../marketing/campaigns.js";
import type * as marketing_drafts from "../marketing/drafts.js";
import type * as marketing_generation from "../marketing/generation.js";
import type * as marketing_generationState from "../marketing/generationState.js";
import type * as marketing_products from "../marketing/products.js";
import type * as marketing_validators from "../marketing/validators.js";
import type * as marketing_workspaces from "../marketing/workspaces.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "marketing/access": typeof marketing_access;
  "marketing/ai": typeof marketing_ai;
  "marketing/analytics": typeof marketing_analytics;
  "marketing/campaigns": typeof marketing_campaigns;
  "marketing/drafts": typeof marketing_drafts;
  "marketing/generation": typeof marketing_generation;
  "marketing/generationState": typeof marketing_generationState;
  "marketing/products": typeof marketing_products;
  "marketing/validators": typeof marketing_validators;
  "marketing/workspaces": typeof marketing_workspaces;
  utils: typeof utils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
