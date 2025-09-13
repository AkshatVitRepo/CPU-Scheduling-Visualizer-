#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

#define MAX 100

typedef struct {
    int pid;
    int burst;
    int remaining;
    int waiting;
    int turnaround;
} Process;

Process proc[MAX];
int n, tq;

/* Circular queue implementation */
int q[MAX];
int qfront = 0, qrear = 0;

void enqueue(int x) {
    int next = (qrear + 1) % MAX;
    if (next == qfront) {
        printf("Queue overflow!\n");
        exit(1);
    }
    q[qrear] = x;
    qrear = next;
}

int dequeue() {
    if (qfront == qrear) return -1; // empty
    int val = q[qfront];
    qfront = (qfront + 1) % MAX;
    return val;
}

bool qempty() {
    return qfront == qrear;
}

void printReadyQueue() {
    if (qempty()) {
        printf("Empty");
        return;
    }
    int i = qfront;
    bool first = true;
    while (i != qrear) {
        if (!first) printf(" ");
        printf("P%d", proc[q[i]].pid);
        first = false;
        i = (i + 1) % MAX;
    }
}

/* Input */
void inputProcesses() {
    printf("\nEnter number of processes: ");
    if (scanf("%d", &n) != 1) exit(0);
    printf("Enter Time Quantum: ");
    if (scanf("%d", &tq) != 1) exit(0);

    for (int i = 0; i < n; i++) {
        proc[i].pid = i + 1;
        printf("Enter burst time of Process P%d: ", proc[i].pid);
        if (scanf("%d", &proc[i].burst) != 1) exit(0);
        proc[i].remaining = proc[i].burst;
        proc[i].waiting = 0;
        proc[i].turnaround = 0;
    }
}

/* Round Robin: prints step-by-step Gantt chart + ready queue */
void roundRobin() {
    int time = 0, completed = 0;

    /* reset queue */
    qfront = qrear = 0;

    /* initially enqueue all processes (arrival = 0 assumption) */
    for (int i = 0; i < n; i++) enqueue(i);

    printf("\n--- Step by Step Gantt Chart ---\n");
    printf("Interval\t| Executed Process | Ready Queue (during execution)\n");
    printf("-------------------------------------------------------------\n");

    while (completed < n) {
        int idx = dequeue();
        if (idx == -1) { /* shouldn't happen if completed < n, but safeguard */
            printf("No process in ready queue but not all completed. Exiting.\n");
            break;
        }

        if (proc[idx].remaining <= 0) {
            /* If this process had 0 remaining (edge), skip */
            continue;
        }

        int exec = (proc[idx].remaining > tq) ? tq : proc[idx].remaining;
        int start = time;
        time += exec;
        proc[idx].remaining -= exec;

        /* Print this slice and the ready queue (which currently contains other waiting processes) */
        printf("%3d - %3d\t|   P%-3d           | ", start, time, proc[idx].pid);
        printReadyQueue();
        printf("\n");

        if (proc[idx].remaining > 0) {
            /* not finished -> re-enqueue at rear */
            enqueue(idx);
        } else {
            /* finished */
            completed++;
            proc[idx].turnaround = time;                 // arrival=0 => turnaround = finish time
            proc[idx].waiting = proc[idx].turnaround - proc[idx].burst;
        }
    }
}

/* Final results */
void displayResults() {
    float totalWT = 0, totalTAT = 0;

    printf("\n--- Final Results ---\n");
    printf("PID\tBurst\tWaiting\tTurnaround\n");
    for (int i = 0; i < n; i++) {
        printf("P%d\t%5d\t%7d\t%10d\n",
               proc[i].pid, proc[i].burst, proc[i].waiting, proc[i].turnaround);
        totalWT += proc[i].waiting;
        totalTAT += proc[i].turnaround;
    }

    printf("\nAverage Waiting Time   = %.2f\n", totalWT / n);
    printf("Average Turnaround Time= %.2f\n", totalTAT / n);
}

int main() {
    int choice;
    while (1) {
        printf("\n====== Round Robin Scheduling ======\n");
        printf("1. Input Processes\n");
        printf("2. Run Round Robin Scheduling\n");
        printf("3. Display Final Results\n");
        printf("4. Exit\n");
        printf("Enter choice: ");
        if (scanf("%d", &choice) != 1) break;

        switch (choice) {
            case 1:
                inputProcesses();
                break;
            case 2:
                roundRobin();
                break;
            case 3:
                displayResults();
                break;
            case 4:
                exit(0);
            default:
                printf("Invalid choice!\n");
        }
    }
    return 0;
}
