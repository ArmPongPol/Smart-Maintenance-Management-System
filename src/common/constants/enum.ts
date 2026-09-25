export enum UserRoleEnum {
  ADMIN = 'ADMINISTRATOR',
  LEADER = 'LEADER',
  TECHINIAN = 'TECHNICIAN',
  OPERATOR = 'OPERATOR',
}

export enum UserStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum MachineStatusEnum {
  RUUING = 'RUNNING',
  STOPPED = 'STOPPED',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export enum MaintenancePriorityEnum {
  LOW = 'LOW',
  MIDDLE = 'MIDDLE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum MaintenanceStatusEnum {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum NodeEnv {
  DEVELOPMENT = 'development',
  TEST = 'test',
  PRODUCTION = 'production',
}
