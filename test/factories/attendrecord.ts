/** AttendRecord JSON envelope used by timesheet import tests. */
export function makeAttendRecordPayload() {
    return {
        attendanceDate: {
            startDate: "01/01/2026",
            endDate: "28/01/2026",
        },
        tablingDate: "28/01/2026 17:10:10",
        workers: [
            {
                userId: "",
                name: "Worker One",
                dates: [
                    {
                        dateIn: "01/01/2026",
                        timeIn: "09:00",
                        dateOut: "01/01/2026",
                        timeOut: "17:00",
                    },
                    {
                        dateIn: "02/01/2026",
                        timeIn: "09:00",
                        dateOut: "02/01/2026",
                        timeOut: "17:00",
                    },
                ],
            },
            {
                userId: "",
                name: "Worker Two",
                dates: [
                    {
                        dateIn: "03/01/2026",
                        timeIn: "10:00",
                        dateOut: "03/01/2026",
                        timeOut: "18:00",
                    },
                ],
            },
        ],
    };
}

export function makeImportOperationalState() {
    return {
        workers: [
            {
                id: "worker-1",
                name: "Worker One",
                status: "Active",
                shiftPattern: "Day Shift",
            },
            {
                id: "worker-2",
                name: "Worker Two",
                status: "Active",
                shiftPattern: "Day Shift",
            },
        ],
        timesheets: [
            {
                id: "existing-timesheet",
                workerId: "worker-2",
                dateIn: "2026-01-15",
                timeIn: "08:00:00",
                dateOut: "2026-01-15",
                timeOut: "16:00:00",
                status: "Timesheet Paid",
            },
        ],
        payrolls: [
            {
                id: "existing-payroll",
                workerId: "worker-2",
                periodStart: "2026-01-01",
                periodEnd: "2026-01-31",
                status: "Settled",
            },
        ],
        advances: [
            {
                id: "existing-advance",
                workerId: "worker-2",
                status: "Paid",
                amount: 300,
            },
        ],
        publicHolidays: [
            {
                id: "existing-holiday",
                date: "2026-01-01",
                name: "New Year's Day",
            },
        ],
    };
}

export function deepCloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}
