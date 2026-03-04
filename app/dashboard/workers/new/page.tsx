import { WorkerForm } from "../worker-form";

export default function NewWorkerPage() {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center">
            <div className="w-full max-w-3xl space-y-6 py-8">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Add worker
                    </h1>
                    <p className="text-muted-foreground">
                        Create a new worker with the form below.
                    </p>
                </div>

                <WorkerForm />
            </div>
        </div>
    );
}
