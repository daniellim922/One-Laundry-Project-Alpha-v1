"use client";

import * as React from "react";
import type { SelectWorker } from "@/db/tables/workersTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const defaultValues = {
    name: "",
    email: "",
    phone: "",
    status: "Active" as SelectWorker["status"],
    employmentType: "Full Time" as SelectWorker["employmentType"],
    employmentArrangement:
        "Local Worker" as SelectWorker["employmentArrangement"],
    countryOfOrigin: "",
    race: "",
    monthlyPay: "",
    hourlyPay: "",
    paymentMethod: undefined as SelectWorker["paymentMethod"],
    payNowPhone: "",
    bankAccountNumber: "",
};

interface WorkerFormProps {
    worker?: SelectWorker | null;
}

export function WorkerForm({ worker }: WorkerFormProps) {
    const isCreate = !worker;
    const [name, setName] = React.useState(worker?.name ?? defaultValues.name);
    const [email, setEmail] = React.useState(
        worker?.email ?? defaultValues.email,
    );
    const [phone, setPhone] = React.useState(
        worker?.phone ?? defaultValues.phone,
    );
    const [status, setStatus] = React.useState(
        worker?.status ?? defaultValues.status,
    );
    const [employmentType, setEmploymentType] = React.useState(
        worker?.employmentType ?? defaultValues.employmentType,
    );
    const [employmentArrangement, setEmploymentArrangement] = React.useState(
        worker?.employmentArrangement ?? defaultValues.employmentArrangement,
    );
    const [countryOfOrigin, setCountryOfOrigin] = React.useState(
        worker?.countryOfOrigin ?? defaultValues.countryOfOrigin,
    );
    const [race, setRace] = React.useState(worker?.race ?? defaultValues.race);
    const [monthlyPay, setMonthlyPay] = React.useState(
        worker?.monthlyPay?.toString() ?? defaultValues.monthlyPay,
    );
    const [hourlyPay, setHourlyPay] = React.useState(
        worker?.hourlyPay?.toString() ?? defaultValues.hourlyPay,
    );
    const [paymentMethod, setPaymentMethod] = React.useState(
        worker?.paymentMethod ?? defaultValues.paymentMethod,
    );
    const [payNowPhone, setPayNowPhone] = React.useState(
        worker?.payNowPhone ?? defaultValues.payNowPhone,
    );
    const [bankAccountNumber, setBankAccountNumber] = React.useState(
        worker?.bankAccountNumber ?? defaultValues.bankAccountNumber,
    );

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        console.log("Submitted worker values", {
            name,
            email,
            phone,
            status,
            employmentType,
            employmentArrangement,
            countryOfOrigin,
            race,
            monthlyPay,
            hourlyPay,
            paymentMethod,
            payNowPhone,
            bankAccountNumber,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {isCreate ? "Add new worker" : worker.name}
                </CardTitle>
                {isCreate ? (
                    <CardDescription>
                        Fill in the details for the new worker.
                    </CardDescription>
                ) : (
                    <CardDescription className="space-y-1 text-sm">
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>ID: {worker.id}</span>
                            <span>•</span>
                            <span>Status: {worker.status}</span>
                            <span>•</span>
                            <span>Type: {worker.employmentType}</span>
                            <span>•</span>
                            <span>
                                Arrangement: {worker.employmentArrangement}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>
                                Created:{" "}
                                {worker.createdAt.toLocaleDateString?.() ??
                                    String(worker.createdAt)}
                            </span>
                            <span>•</span>
                            <span>
                                Updated:{" "}
                                {worker.updatedAt.toLocaleDateString?.() ??
                                    String(worker.updatedAt)}
                            </span>
                        </div>
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    autoComplete="off">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={status}
                                onValueChange={(value) =>
                                    setStatus(value as SelectWorker["status"])
                                }>
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="Inactive">
                                        Inactive
                                    </SelectItem>
                                    <SelectItem value="On Leave">
                                        On Leave
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={phone}
                                onChange={(event) =>
                                    setPhone(event.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="employmentType">
                                Employment Type
                            </Label>
                            <Select
                                value={employmentType}
                                onValueChange={(value) =>
                                    setEmploymentType(
                                        value as SelectWorker["employmentType"],
                                    )
                                }>
                                <SelectTrigger id="employmentType">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Full Time">
                                        Full Time
                                    </SelectItem>
                                    <SelectItem value="Part Time">
                                        Part Time
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="employmentArrangement">
                                Employment Arrangement
                            </Label>
                            <Select
                                value={employmentArrangement}
                                onValueChange={(value) =>
                                    setEmploymentArrangement(
                                        value as SelectWorker["employmentArrangement"],
                                    )
                                }>
                                <SelectTrigger id="employmentArrangement">
                                    <SelectValue placeholder="Select arrangement" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Foreign Worker">
                                        Foreign Worker
                                    </SelectItem>
                                    <SelectItem value="Local Worker">
                                        Local Worker
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="countryOfOrigin">
                                Country of Origin
                            </Label>
                            <Input
                                id="countryOfOrigin"
                                value={countryOfOrigin}
                                onChange={(event) =>
                                    setCountryOfOrigin(event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="race">Race</Label>
                            <Input
                                id="race"
                                value={race}
                                onChange={(event) =>
                                    setRace(event.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="monthlyPay">Monthly Pay</Label>
                            <Input
                                id="monthlyPay"
                                type="number"
                                value={monthlyPay}
                                onChange={(event) =>
                                    setMonthlyPay(event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="hourlyPay">Hourly Pay</Label>
                            <Input
                                id="hourlyPay"
                                type="number"
                                value={hourlyPay}
                                onChange={(event) =>
                                    setHourlyPay(event.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="paymentMethod">
                                Payment Method
                            </Label>
                            <Select
                                value={paymentMethod}
                                onValueChange={(value) =>
                                    setPaymentMethod(
                                        value as NonNullable<
                                            SelectWorker["paymentMethod"]
                                        >,
                                    )
                                }>
                                <SelectTrigger id="paymentMethod">
                                    <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PayNow">
                                        PayNow
                                    </SelectItem>
                                    <SelectItem value="Bank Transfer">
                                        Bank Transfer
                                    </SelectItem>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="payNowPhone">PayNow Phone</Label>
                            <Input
                                id="payNowPhone"
                                value={payNowPhone}
                                onChange={(event) =>
                                    setPayNowPhone(event.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bankAccountNumber">
                            Bank Account Number
                        </Label>
                        <Input
                            id="bankAccountNumber"
                            value={bankAccountNumber}
                            onChange={(event) =>
                                setBankAccountNumber(event.target.value)
                            }
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="submit">
                            {isCreate ? "Add worker" : "Save changes"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
