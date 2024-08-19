import camelcaseKeys from "camelcase-keys";
import snakecaseKeys from "snakecase-keys";
import { CamelCasedPropertiesDeep, SnakeCasedPropertiesDeep } from "type-fest";
import z, { ZodEffects } from "zod";

/**
 * Transforms a zod schema defined in snake_case to camelCase during parsing.
 *
 * @param zod
 * @returns
 */
export const withCamelCaseTransform = <T extends z.ZodTypeAny>(
	zod: T,
): ZodEffects<z.ZodTypeAny, CamelCasedPropertiesDeep<T["_output"]>> =>
	zod.transform((val) => camelcaseKeys(val) as CamelCasedPropertiesDeep<T>);

/**
 * Transforms a zod schema defined in camelCase to snake_case during parsing.
 *
 * @param zod
 * @returns
 */
export const withSnakeCaseTransform = <T extends z.ZodTypeAny>(
	zod: T,
): ZodEffects<z.ZodTypeAny, SnakeCasedPropertiesDeep<T["_output"]>> =>
	zod.transform((val) => snakecaseKeys(val) as SnakeCasedPropertiesDeep<T>);
