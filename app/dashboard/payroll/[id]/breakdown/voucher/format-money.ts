export function formatMoney(value: number | null | undefined): string {
    if (value == null) return "$0";
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    const formatted = Number.isInteger(abs)
        ? abs.toLocaleString("en-SG")
        : abs.toLocaleString("en-SG", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          });
    return `${sign}$${formatted}`;
}

export function isZeroish(value: number | null | undefined): boolean {
    if (value == null) return true;
    return Number(value) === 0;
}
