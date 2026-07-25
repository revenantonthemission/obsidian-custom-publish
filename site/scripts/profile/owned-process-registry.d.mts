import type { ChildProcess } from 'node:child_process';

export function assertOwnedProcessTreeSupport(): void;
export function assertOwnedProcessObservationSupport(): Promise<void>;

export function prepareOwnedSpawn(label: string): Readonly<{
  adopt(child: ChildProcess): Readonly<{
    pid: number;
    release(): void;
  }>;
  cancel(): void;
}>;

export function registerOwnedProcess(
  child: ChildProcess,
  label: string,
): Readonly<{
  pid: number;
  release(): void;
}>;

export function registerOwnedProcessGroup(
  processGroupId: number,
  label: string,
): Readonly<{
  pid: number;
  release(): void;
}>;

export function snapshotDescendantProcessTree(
  rootProcessIds: readonly number[],
): Promise<Readonly<{
  processIds: readonly number[];
  processGroupIds: readonly number[];
  processes: readonly Readonly<{
    pid: number;
    ppid: number;
    pgid: number;
    sessionId: number;
    startedAt: string;
  }>[];
  processTable: readonly Readonly<{
    pid: number;
    ppid: number;
    pgid: number;
    sessionId: number;
    startedAt: string;
  }>[];
}>>;

export function monitorOwnedDescendants(input: {
  rootPid: number;
  label: string;
  intervalMs?: number;
  isRootHandleCurrent?: () => boolean;
}): Readonly<{
  ready(): Promise<Readonly<{
    rootPid: number;
    sampleCount: number;
    observedProcessIds: readonly number[];
    observedProcessGroupIds: readonly number[];
    activeProcessGroupIds: readonly number[];
    activeRootProcessGroup: boolean;
    rootProcessIdentity: Readonly<{
      pid: number;
      ppid: number;
      pgid: number;
      sessionId: number;
      startedAt: string;
    }> | null;
    failures: readonly Readonly<{
      name: string;
      message: string;
    }>[];
  }>>;
  stop(): Promise<Readonly<{
    rootPid: number;
    sampleCount: number;
    observedProcessIds: readonly number[];
    observedProcessGroupIds: readonly number[];
    activeProcessGroupIds: readonly number[];
    activeRootProcessGroup: boolean;
    rootProcessIdentity: Readonly<{
      pid: number;
      ppid: number;
      pgid: number;
      sessionId: number;
      startedAt: string;
    }> | null;
    failures: readonly Readonly<{
      name: string;
      message: string;
    }>[];
  }>>;
  releaseVerified(): void;
}>;

export function freezeOwnedProcessTree(input: {
  rootProcessGroupIds: readonly number[];
  label: string;
}): Promise<Readonly<{
  evidence: Readonly<{
    processIds: readonly number[];
    processGroupIds: readonly number[];
  }>;
  releaseVerified(): void;
}>>;

export const ownedProcessRegistryTesting: Readonly<{
  isOwnedGroupAlive(pid: number): boolean;
  ownedCount(): number;
}>;
