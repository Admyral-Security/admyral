import z from "zod";

const Literal = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type TLiteral = z.infer<typeof Literal>;

export type TJson = TLiteral | { [key: string]: TJson } | TJson[];
export const Json: z.ZodType<unknown> = z.lazy(() =>
	z.union([Literal, z.array(Json), z.object({}).catchall(Json)]),
);
