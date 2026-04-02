"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SelectSearchOption = {
    value: string;
    label: string;
    /** Optional extra text to match when searching (e.g. id, alias). */
    keywords?: string;
};

type Props = {
    options: SelectSearchOption[];
    value: string;
    onChange: (
        value: string,
        label: string,
        option: SelectSearchOption,
    ) => void;

    name?: string;
    required?: boolean;
    disabled?: boolean;

    id?: string;
    "aria-invalid"?: boolean;
    "data-testid"?: string;

    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
};

export function SelectSearch({
    options,
    value,
    onChange,
    name,
    required,
    disabled,
    id,
    "aria-invalid": ariaInvalid,
    "data-testid": dataTestId,
    placeholder = "Search or select…",
    searchPlaceholder = "Search…",
    emptyText = "No results found.",
}: Props) {
    const [open, setOpen] = React.useState(false);
    const selected = options.find((o) => o.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            {name ? (
                <input
                    type="hidden"
                    name={name}
                    value={value}
                    readOnly
                    required={required}
                    aria-hidden
                />
            ) : null}
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-invalid={ariaInvalid}
                    data-testid={dataTestId}
                    disabled={disabled}
                    className="h-auto min-h-9 w-full justify-between py-2 font-normal"
                >
                    <span
                        className={cn(
                            "truncate text-left",
                            !selected && "text-muted-foreground",
                        )}
                    >
                        {selected ? selected.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="max-w-md min-w-[280px] p-0 sm:min-w-[320px]"
                align="start"
            >
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => (
                                <CommandItem
                                    key={opt.value}
                                    value={`${opt.label} ${opt.value} ${
                                        opt.keywords ?? ""
                                    }`}
                                    onSelect={() => {
                                        onChange(opt.value, opt.label, opt);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "size-4 shrink-0",
                                            value === opt.value
                                                ? "opacity-100"
                                                : "opacity-0",
                                        )}
                                    />
                                    {opt.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

