function isObject(data: any): boolean {
	return typeof data === "object" && !Array.isArray(data) && data !== null;
}

function toCamelCase(s: string): string {
	return s.replace(/([-_][a-z])/gi, ($1) => {
		return $1.toUpperCase().replace("-", "").replace("_", "");
	});
}

export function transformObjectKeysToCamelCase(data: any): any {
	if (isObject(data)) {
		const newObject = {} as Record<string, any>;
		Object.keys(data).forEach((key) => {
			newObject[toCamelCase(key)] = transformObjectKeysToCamelCase(
				data[key],
			);
		});
		return newObject;
	}

	if (Array.isArray(data) && data !== null) {
		return data.map((datum) => transformObjectKeysToCamelCase(datum));
	}

	return data;
}

function toSnakeCase(s: string): string {
	return s.replace(/([a-z][A-Z])/g, ($2) => {
		return `${$2[0].toLowerCase()}_${$2[1].toLowerCase()}`;
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
