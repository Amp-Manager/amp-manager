export interface DockerStat {
  Name: string;
  CPUPerc: string;
  MemUsage: string;
  MemPerc: string;
  NetIO: string;
  BlockIO: string;
  PIDs: string;
}

export interface DockerDisk {
  Type: string;
  Total: string;
  Active: string;
  Size: string;
  Reclaimable: string;
}

export interface DockerDiskUsage {
  Images: DockerDisk[];
  Containers: DockerDisk[];
  Volumes: DockerDisk[];
  BuildCache: DockerDisk[];
}

export interface DockerInfo {
  NCPU: number;
  MemTotal: number;
  Driver: string;
  ServerVersion: string;
  ContainersRunning: number;
  ContainersStopped: number;
  Images: number;
  OSType?: string;
}

export interface DockerEnvMetrics {
  info: DockerInfo;
  df: DockerDiskUsage;
}
