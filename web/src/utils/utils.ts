function isObject(data: any): boolean {
	return typeof data === "object" && !Array.isArray(data) && data !== null;
}

function toCamelCase(s: string): string {
	return s.replace(/([-_][a-z0-9])/g, ($1) => {
		return $1.toUpperCase().replace("-", "").replace("_", "");
	});
}

export function transformObjectKeysToCamelCase(
	data: any,
	excludedFields: Set<string> = new Set(),
): any {
	if (isObject(data)) {
		const newObject = {} as Record<string, any>;
		Object.keys(data).forEach((key) => {
			newObject[toCamelCase(key)] = excludedFields.has(key)
				? data[key]
				: transformObjectKeysToCamelCase(data[key]);
		});
		return newObject;
	}

	if (Array.isArray(data) && data !== null) {
		return data.map((element) =>
			transformObjectKeysToCamelCase(element, excludedFields),
		);
	}

	return data;
}

function toSnakeCase(s: string): string {
	return s.replace(/([a-z0-9][A-Z])/g, ($1) => {
		return `${$1[0].toLowerCase()}_${$1[1].toLowerCase()}`;
	});
}

export function transformObjectKeysToSnakeCase(data: any): any {
	if (isObject(data)) {
		const newObject = {} as Record<string, any>;
		Object.keys(data).forEach((key) => {
			newObject[toSnakeCase(key)] = transformObjectKeysToSnakeCase(
				data[key],
			);
		});
		return newObject;
	}

	if (Array.isArray(data) && data !== null) {
		return data.map((datum) => transformObjectKeysToSnakeCase(datum));
	}

	return data;
}
