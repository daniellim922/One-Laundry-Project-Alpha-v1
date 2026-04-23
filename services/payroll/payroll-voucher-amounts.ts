function roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

export function clampHoursNotMet(hoursNotMet: number): number {
    return hoursNotMet > 0 ? 0 : hoursNotMet;
}

export function calcHoursNotMetDeduction(args: {
    hoursNotMet: number | null;
    hourlyRate: number | null;
}): number {
    const { hoursNotMet, hourlyRate } = args;
    if (hoursNotMet == null || hoursNotMet === 0) return 0;
    return -roundMoney(Math.max(0, -hoursNotMet) * (hourlyRate ?? 0));
}

export function calculateVoucherAmounts(args: {
    basePayTotal: number;
    cpf: number | null;
    advance?: number | null;
    hoursNotMet: number | null;
    hourlyRate: number | null;
}) {
    const rawDeduction = calcHoursNotMetDeduction({
        hoursNotMet: args.hoursNotMet,
        hourlyRate: args.hourlyRate,
    });
    const hoursNotMetDeduction = Math.max(rawDeduction, -args.basePayTotal);
    const subTotal = roundMoney(args.basePayTotal + hoursNotMetDeduction);
    const grandTotal = roundMoney(
        subTotal - (args.cpf ?? 0) - (args.advance ?? 0),
    );

    return {
        hoursNotMetDeduction,
        subTotal,
        grandTotal,
    };
}
