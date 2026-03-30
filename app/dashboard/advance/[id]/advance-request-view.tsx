import Link from "next/link";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    advanceRequestStatusBadgeClass,
    advanceStatusBadgeClass,
    formatAdvanceDate,
} from "@/app/dashboard/advance/_presentation/advance-display";
import type { AdvanceRequestDetail } from "@/lib/advances-queries";
import { Banknote } from "lucide-react";

type AdvanceRequestViewProps = {
    detail: AdvanceRequestDetail;
    advanceRequestId: string;
};

export function AdvanceRequestView({
    detail,
    advanceRequestId,
}: AdvanceRequestViewProps) {
    const {
        request,
        advances,
        purpose,
        employeeSignature,
        employeeSignatureDate,
        managerSignature,
        managerSignatureDate,
    } = detail;

    return (
        <FieldGroup className="gap-6">
            <Card>
                <CardHeader className="border-b pb-4">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                        1. Advance information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        <Field className="min-w-0 space-y-2">
                            <FieldLabel>Employee</FieldLabel>
                            <Link
                                href={`/dashboard/worker/${request.workerId}/view`}
                                className="font-medium text-primary underline-offset-4 hover:underline">
                                {request.workerName}
                            </Link>
                        </Field>

                        <Field className="min-w-0 space-y-2">
                            <FieldLabel>Date of request</FieldLabel>
                            <p data-testid="advance-detail-loan-date">
                                {formatAdvanceDate(request.requestDate)}
                            </p>
                        </Field>
                    </div>

                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        <Field className="space-y-2">
                            <FieldLabel>Amount requested</FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    type="text"
                                    readOnly
                                    value={`$${request.amountRequested}`}
                                    className="bg-muted/50"
                                    data-testid="advance-detail-amount"
                                />
                                <InputGroupAddon>
                                    <Banknote className="size-4 text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                        </Field>

                        <Field className="space-y-2">
                            <FieldLabel>Status</FieldLabel>
                            <div className="w-fit!">
                                <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                        advanceRequestStatusBadgeClass[
                                            request.status
                                        ] ?? ""
                                    }`}
                                    data-testid="advance-detail-status">
                                    {request.status}
                                </span>
                            </div>
                        </Field>
                    </div>

                    <Field className="space-y-2">
                        <FieldLabel>Purpose of advance</FieldLabel>
                        <p className="whitespace-pre-wrap min-h-[100px] rounded-md border bg-muted/30 px-3 py-2 text-sm">
                            {purpose || "—"}
                        </p>
                    </Field>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                        2. Repayment terms
                    </CardTitle>
                    <p className="text-muted-foreground text-sm">
                        Each installment is tracked as a separate advance
                    </p>
                </CardHeader>
                <CardContent className="pt-2">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Installment amount</TableHead>
                                <TableHead>Expected repayment date</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {advances.map((adv) => (
                                <TableRow key={adv.id}>
                                    <TableCell>
                                        {`$${adv.amount}`}
                                    </TableCell>
                                    <TableCell>
                                        {adv.repaymentDate
                                            ? formatAdvanceDate(
                                                  adv.repaymentDate,
                                              )
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                advanceStatusBadgeClass[
                                                    adv.status
                                                ] ?? ""
                                            }`}>
                                            {adv.status}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell>
                                    {`$${advances.reduce(
                                        (sum, adv) => sum + adv.amount,
                                        0,
                                    )}`}
                                </TableCell>
                                <TableCell />
                                <TableCell />
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b pb-4">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                        3. Employee acknowledgment
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        I acknowledge that this advance is a loan and will be
                        repaid according to the agreed terms. I authorize the
                        company to deduct the repayment from my salary as
                        specified.
                    </p>
                    <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <FieldLabel className="text-muted-foreground font-normal">
                                    Employee signature
                                </FieldLabel>
                                {employeeSignature ? (
                                    <div className="relative aspect-3/1 max-w-xs overflow-hidden rounded border bg-muted/30">
                                        <Image
                                            src={employeeSignature}
                                            alt="Employee signature"
                                            fill
                                            className="object-contain p-2"
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        —
                                    </p>
                                )}
                                <div>
                                    <span className="text-muted-foreground text-sm">
                                        Date signed:{" "}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {employeeSignatureDate
                                            ? formatAdvanceDate(
                                                  employeeSignatureDate,
                                              )
                                            : "—"}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <FieldLabel className="text-muted-foreground font-normal">
                                    Manager&apos;s signature
                                </FieldLabel>
                                {managerSignature ? (
                                    <div className="relative aspect-3/1 max-w-xs overflow-hidden rounded border bg-muted/30">
                                        <Image
                                            src={managerSignature}
                                            alt="Manager signature"
                                            fill
                                            className="object-contain p-2"
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        —
                                    </p>
                                )}
                                <div>
                                    <span className="text-muted-foreground text-sm">
                                        Date signed:{" "}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {managerSignatureDate
                                            ? formatAdvanceDate(
                                                  managerSignatureDate,
                                              )
                                            : "—"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </FieldGroup>
    );
}
