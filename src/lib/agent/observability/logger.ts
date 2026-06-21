// ==========================================
// OBSERVABILITY LOGGER
// Principle: Every action is traceable
// ==========================================

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  action: string;
  details: any;
  latencyMs?: number;
  cost?: number;
}

export class ObservabilityLogger {
  private static logs: LogEntry[] = [];

  static log(level: LogLevel, component: string, action: string, details: any = {}, latencyMs?: number, cost?: number) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      action,
      details,
      latencyMs,
      cost
    };
    
    this.logs.push(entry);
    
    // In production, this would stream to Datadog / CloudWatch / Sentry
    const color = level === 'ERROR' || level === 'CRITICAL' ? '\x1b[31m' : '\x1b[36m';
    console.log(`${color}[${entry.timestamp}] [${level}] [${component}] ${action}\x1b[0m`, details);
  }

  static getLogs() {
    return this.logs;
  }
}
