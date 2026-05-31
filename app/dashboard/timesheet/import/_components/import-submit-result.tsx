export function ImportSubmitResult({
    submitResult,
}: {
    submitResult: {
        imported?: number;
        skipped?: number;
        errors?: string[];
    };
}) {
    return (
        <div className="mt-4 rounded-lg border p-4">
            {submitResult.imported != null && submitResult.imported > 0 && (
                <p className="text-emerald-600 dark:text-emerald-400">
                    Imported {submitResult.imported}{" "}
                    {submitResult.imported === 1 ? "entry" : "entries"}.
                    {submitResult.skipped != null &&
                        submitResult.skipped > 0 && (
                            <>
                                {" "}
                                Skipped {submitResult.skipped}{" "}
                                {submitResult.skipped === 1
                                    ? "duplicate"
                                    : "duplicates"}
                                .
                            </>
                        )}
                </p>
            )}
            {submitResult.imported === 0 && (submitResult.skipped ?? 0) > 0 && (
                <p className="text-amber-600 dark:text-amber-400">
                    No new entries imported. Skipped {submitResult.skipped}{" "}
                    {(submitResult.skipped ?? 0) === 1
                        ? "duplicate"
                        : "duplicates"}
                    .
                </p>
            )}
            {submitResult.errors && submitResult.errors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-sm text-amber-600 dark:text-amber-400">
                    {submitResult.errors.slice(0, 5).map((e, i) => (
                        <li key={i}>{e}</li>
                    ))}
                    {submitResult.errors.length > 5 && (
                        <li>…and {submitResult.errors.length - 5} more</li>
                    )}
                </ul>
            )}
        </div>
    );
}
