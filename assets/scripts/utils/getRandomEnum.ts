export function getRandomEnum<T>(anEnum: T, max?: number): T[keyof T] {
    const enumValues = Object.keys(anEnum)
        .map(n => Number.parseInt(n))
        .filter(n => !Number.isNaN(n)) as unknown as T[keyof T][];

    max = max || enumValues.length;

    const randomIndex = Math.floor(Math.random() * max);
    const randomEnumValue = enumValues[randomIndex];
    return randomEnumValue;
}
