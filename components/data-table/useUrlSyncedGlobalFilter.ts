"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type UseUrlSyncedGlobalFilterArgs = {
    searchParamKey: string;
    syncSearchToUrl: boolean;
    debounceMs: number;
};

export function useUrlSyncedGlobalFilter({
    searchParamKey,
    syncSearchToUrl,
    debounceMs,
}: UseUrlSyncedGlobalFilterArgs) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const initialFilter = React.useMemo(() => {
        if (!syncSearchToUrl) return "";
        return searchParams.get(searchParamKey) ?? "";
    }, [searchParamKey, searchParams, syncSearchToUrl]);

    const [value, setValue] = React.useState(initialFilter);

    React.useEffect(() => {
        if (!syncSearchToUrl) return;
        const currentValue = searchParams.get(searchParamKey) ?? "";
        setValue((prev) => (prev === currentValue ? prev : currentValue));
    }, [searchParamKey, searchParams, syncSearchToUrl]);

    const updateUrlImmediate = React.useCallback(
        (nextValue: string) => {
            if (!syncSearchToUrl) return;
            const params = new URLSearchParams(searchParams.toString());
            if (nextValue) {
                params.set(searchParamKey, nextValue);
            } else {
                params.delete(searchParamKey);
            }
            router.replace(`${pathname}?${params.toString()}`);
        },
        [pathname, router, searchParamKey, searchParams, syncSearchToUrl],
    );

    const updateUrlImmediateRef = React.useRef(updateUrlImmediate);
    React.useEffect(() => {
        updateUrlImmediateRef.current = updateUrlImmediate;
    }, [updateUrlImmediate]);

    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelPending = React.useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    React.useEffect(() => cancelPending, [cancelPending]);
    React.useEffect(() => {
        cancelPending();
    }, [cancelPending, pathname, searchParamKey]);

    const setAndSync = React.useCallback(
        (nextValue: string) => {
            setValue(nextValue);
            if (!syncSearchToUrl) return;
            cancelPending();
            timeoutRef.current = setTimeout(() => {
                updateUrlImmediateRef.current(nextValue);
            }, debounceMs);
        },
        [cancelPending, debounceMs, syncSearchToUrl],
    );

    return { value, setValue: setAndSync };
}

