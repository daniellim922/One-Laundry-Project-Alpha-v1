import Link from "next/link";
import { Calendar, DollarSign, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { installmentToneClassName } from "@/types/badge-tones";
import type { AdvanceRequestDetail } from "@/utils/advance/queries";
import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function AdvanceRequestReadOnlyBody({
    detail,
}: {
    detail: AdvanceRequestDetail;
}) {
    const {
        request,
        advances,
        purpose,
        employeeSignature,
        managerSignature,
        employeeSignatureDate,
        managerSignatureDate,
    } = detail;

    return (
        <FieldGroup className="gap-6">
            <Card>
                <CardHeader className="border-b pb-4">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                        Advance information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        <div className="flex min-w-0 items-center gap-3">
                            <User
                                className="size-6 shrink-0 text-muted-foreground"
                                aria-hidden
                            />
                            <div className="min-w-0 space-y-1">
                                <p className="text-muted-foreground text-sm leading-none font-medium">
                                    Employee
                                </p>
                                <Link
                                    href={`/dashboard/worker/${request.workerId}/view`}
                                    className="font-medium text-primary underline underline-offset-4 hover:opacity-80">
                                    {request.workerName}
                                </Link>
                            </div>
                        </div>

                        <div
                            className="flex min-w-0 items-center gap-3"
                            data-testid="advance-detail-request-date">
                            <Calendar
                                className="size-6 shrink-0 text-muted-foreground"
                                aria-hidden
                            />
                            <div className="min-w-0 space-y-1">
                                <p className="text-muted-foreground text-sm leading-none font-medium">
                                    Date of request
                                </p>
                                <span className="text-primary">
                                    {formatEnGbDmyNumericFromCalendar(
                                        request.requestDate,
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div
                        className="flex items-center gap-3"
                        data-testid="advance-detail-amount">
                        <DollarSign
                            className="size-6 shrink-0 text-muted-foreground"
                            aria-hidden
                        />
                        <div className="min-w-0 space-y-1">
                            <p className="text-muted-foreground text-sm leading-none font-medium">
                                Amount requested
                            </p>
                            <span className="text-primary">
                                ${request.amountRequested}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-1 border-t pt-4">
                        <p className="text-lg font-medium">
                            Purpose of advance
                        </p>
                        <p className="text-md whitespace-pre-wrap text-muted-foreground">
                            {purpose || "—"}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                        Repayment terms
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
                                    <TableCell>{`$${adv.amount}`}</TableCell>
                                    <TableCell>
                                        {adv.repaymentDate
                                            ? formatEnGbDmyNumericFromCalendar(
                                                  adv.repaymentDate,
                                              )
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={
                                                installmentToneClassName[
                                                    adv.status
                                                ]
                                            }>
                                            {adv.status}
                                        </Badge>
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
                        Signatures
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 pt-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <p className="text-muted-foreground text-sm font-medium leading-none">
                            Manager
                        </p>
                        {managerSignature ? (
                            // eslint-disable-next-line @next/next/no-img-element -- data URL from stored signature
                            <img
                                src={managerSignature}
                                alt=""
                                className="max-h-28 w-full rounded-md border bg-white object-contain dark:bg-neutral-100"
                            />
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                Not signed
                            </p>
                        )}
                        {managerSignatureDate ? (
                            <p className="text-muted-foreground text-xs">
                                {`Signed ${formatEnGbDmyNumericFromCalendar(managerSignatureDate)}`}
                            </p>
                        ) : null}
                    </div>
                    <div className="space-y-2">
                        <p className="text-muted-foreground text-sm font-medium leading-none">
                            Employee
                        </p>
                        {employeeSignature ? (
                            // eslint-disable-next-line @next/next/no-img-element -- data URL from stored signature
                            <img
                                src={employeeSignature}
                                alt=""
                                className="max-h-28 w-full rounded-md border bg-white object-contain dark:bg-neutral-100"
                            />
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                Not signed
                            </p>
                        )}
                        {employeeSignatureDate ? (
                            <p className="text-muted-foreground text-xs">
                                {`Signed ${formatEnGbDmyNumericFromCalendar(employeeSignatureDate)}`}
                            </p>
                        ) : null}
                    </div>
                </CardContent>
            </Card>
        </FieldGroup>
    );
}
