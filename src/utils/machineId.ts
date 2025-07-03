import { machineId as getMachineId } from 'node-machine-id';

export default async function machineId(original: boolean = false): Promise<string> {
    return getMachineId(original);
} 