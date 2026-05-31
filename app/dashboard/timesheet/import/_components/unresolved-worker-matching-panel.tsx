import { AmberCallout } from "./amber-callout";

export function UnresolvedWorkerMatchingPanel({
    unresolvedNames,
}: {
    unresolvedNames: string[];
}) {
    if (unresolvedNames.length === 0) return null;

    return (
        <AmberCallout title="Unresolved worker matches">
            <p className="mt-1">
                {unresolvedNames.length} worker{" "}
                {unresolvedNames.length !== 1 ? "names" : "name"} must match an
                active Worker before upload.
            </p>
            <ul className="mt-2 list-inside list-disc">
                {unresolvedNames.map((workerName) => (
                    <li key={workerName}>{workerName}</li>
                ))}
            </ul>
        </AmberCallout>
    );
}
