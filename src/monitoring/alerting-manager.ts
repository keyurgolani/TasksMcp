/**
 * Alerting and notification management system
 */

import { EventEmitter } from 'events';
// import { ConfigManager } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { MemoryAlert } from './memory-monitor.js';
import type { ErrorReport } from '../core/error-handler.js';

export interface Alert {
  id: string;
  type: 'performance' | 'memory' | 'storage' | 'error' | 'health' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  source: string;
  metadata: Record<string, any>;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: number;
  escalated: boolean;
  escalatedAt?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  type: Alert['type'];
  condition: AlertCondition;
  severity: Alert['severity'];
  enabled: boolean;
  cooldownMs: number;
  escalationTimeMs: number;
  notificationChannels: string[];
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains';
  threshold: number | string;
  timeWindowMs: number;
  minOccurrences: number;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'webhook' | 'email' | 'slack' | 'console';
  config: Record<string, any>;
  enabled: boolean;
}

export interface AlertingStats {
  totalAlerts: number;
  activeAlerts: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  averageResolutionTime: number;
  escalationRate: number;
}

export class AlertingManager extends EventEmitter {
  // Configuration loaded on demand to avoid circular dependencies
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private notificationChannels: NotificationChannel[] = [];
  private readonly maxAlerts = 10000;
  private readonly alertCooldowns = new Map<string, number>();
  private metricsCache = new Map<
    string,
    Array<{ value: number; timestamp: number }>
  >();

  constructor() {
    super();
    this.initializeDefaultRules();
    this.initializeDefaultChannels();
  }

  /**
   * Add an alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const alertRule: AlertRule = {
      id: this.generateId(),
      ...rule,
    };

    this.alertRules.push(alertRule);
    logger.info('Alert rule added', {
      ruleId: alertRule.id,
      name: alertRule.name,
    });

    return alertRule.id;
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (index === -1) {
      return false;
    }

    const rule = this.alertRules[index];
    this.alertRules.splice(index, 1);
    logger.info('Alert rule removed', { ruleId, name: rule?.name });

    return true;
  }

  /**
   * Add a notification channel
   */
  addNotificationChannel(channel: Omit<NotificationChannel, 'id'>): string {
    const notificationChannel: NotificationChannel = {
      id: this.generateId(),
      ...channel,
    };

    this.notificationChannels.push(notificationChannel);
    logger.info('Notification channel added', {
      channelId: notificationChannel.id,
      name: notificationChannel.name,
      type: notificationChannel.type,
    });

    return notificationChannel.id;
  }

  /**
   * Process a metric value and check for alert conditions
   */
  async processMetric(
    metric: string,
    value: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    // Store metric value
    this.storeMetricValue(metric, value);

    // Check all relevant alert rules
    const relevantRules = this.alertRules.filter(
      rule => rule.enabled && rule.condition.metric === metric
    );

    for (const rule of relevantRules) {
      await this.evaluateAlertRule(rule, value, metadata);
    }
  }

  /**
   * Create an alert directly
   */
  async createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    title: string,
    message: string,
    source: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const alert: Alert = {
      id: this.generateId(),
      type,
      severity,
      title,
      message,
      timestamp: Date.now(),
      source,
      metadata,
      acknowledged: false,
      resolved: false,
      escalated: false,
    };

    return await this.addAlert(alert);
  }

  /**
   * Process memory alert
   */
  async processMemoryAlert(memoryAlert: MemoryAlert): Promise<void> {
    await this.createAlert(
      'memory',
      memoryAlert.severity as Alert['severity'],
      `Memory Alert: ${memoryAlert.type}`,
      memoryAlert.message,
      'memory-monitor',
      memoryAlert.data
    );
  }

  /**
   * Process error report
   */
  async processErrorReport(errorReport: ErrorReport): Promise<void> {
    const severity = this.mapErrorSeverity(errorReport.severity);

    await this.createAlert(
      'error',
      severity,
      `Error: ${errorReport.category}`,
      errorReport.error.message,
      'error-handler',
      {
        errorId: errorReport.id,
        category: errorReport.category,
        operation: errorReport.context.operation,
        recoverable: errorReport.recoverable,
        retryable: errorReport.retryable,
      }
    );
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.acknowledged) {
      return false;
    }

    alert.acknowledged = true;
    alert.metadata['acknowledgedBy'] = acknowledgedBy;
    alert.metadata['acknowledgedAt'] = Date.now();

    logger.info('Alert acknowledged', { alertId, acknowledgedBy });
    this.emit('alertAcknowledged', alert);

    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(
    alertId: string,
    resolvedBy?: string,
    resolution?: string
  ): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();
    alert.metadata['resolvedBy'] = resolvedBy;
    alert.metadata['resolution'] = resolution;

    logger.info('Alert resolved', { alertId, resolvedBy, resolution });
    this.emit('alertResolved', alert);

    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(type?: Alert['type'], severity?: Alert['severity']): Alert[] {
    return this.alerts.filter(alert => {
      if (alert.resolved) return false;
      if (type && alert.type !== type) return false;
      if (severity && alert.severity !== severity) return false;
      return true;
    });
  }

  /**
   * Get alert statistics
   */
  getAlertingStats(timeWindowMs = 86400000): AlertingStats {
    const cutoffTime = Date.now() - timeWindowMs;
    const recentAlerts = this.alerts.filter(a => a.timestamp > cutoffTime);
    const activeAlerts = this.getActiveAlerts();

    const alertsByType: Record<string, number> = {};
    const alertsBySeverity: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let escalatedCount = 0;

    for (const alert of recentAlerts) {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      alertsBySeverity[alert.severity] =
        (alertsBySeverity[alert.severity] || 0) + 1;

      if (alert.resolved && alert.resolvedAt) {
        totalResolutionTime += alert.resolvedAt - alert.timestamp;
        resolvedCount++;
      }

      if (alert.escalated) {
        escalatedCount++;
      }
    }

    return {
      totalAlerts: recentAlerts.length,
      activeAlerts: activeAlerts.length,
      alertsByType,
      alertsBySeverity,
      averageResolutionTime:
        resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      escalationRate:
        recentAlerts.length > 0 ? escalatedCount / recentAlerts.length : 0,
    };
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Get notification channels
   */
  getNotificationChannels(): NotificationChannel[] {
    return [...this.notificationChannels];
  }

  /**
   * Test notification channel
   */
  async testNotificationChannel(channelId: string): Promise<boolean> {
    const channel = this.notificationChannels.find(c => c.id === channelId);
    if (!channel) {
      return false;
    }

    try {
      await this.sendNotification(channel, {
        id: 'test',
        type: 'health',
        severity: 'low',
        title: 'Test Notification',
        message: 'This is a test notification to verify channel configuration',
        timestamp: Date.now(),
        source: 'alerting-manager',
        metadata: { test: true },
        acknowledged: false,
        resolved: false,
        escalated: false,
      });

      logger.info('Test notification sent successfully', {
        channelId,
        name: channel.name,
      });
      return true;
    } catch (error) {
      logger.error('Test notification failed', {
        channelId,
        name: channel.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  private async addAlert(alert: Alert): Promise<string> {
    // Check cooldown
    const cooldownKey = `${alert.type}_${alert.source}`;
    const lastAlertTime = this.alertCooldowns.get(cooldownKey) || 0;
    const cooldownMs = 300000; // 5 minutes default cooldown

    if (Date.now() - lastAlertTime < cooldownMs) {
      logger.debug('Alert suppressed due to cooldown', {
        type: alert.type,
        source: alert.source,
        cooldownRemaining: cooldownMs - (Date.now() - lastAlertTime),
      });
      return alert.id;
    }

    // Add alert
    this.alerts.push(alert);
    this.alertCooldowns.set(cooldownKey, Date.now());

    // Maintain alert limit
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Log alert
    this.logAlert(alert);

    // Send notifications
    await this.sendAlertNotifications(alert);

    // Emit event
    this.emit('alertCreated', alert);

    // Schedule escalation check
    this.scheduleEscalationCheck(alert);

    return alert.id;
  }

  private async evaluateAlertRule(
    rule: AlertRule,
    currentValue: number,
    metadata: Record<string, any>
  ): Promise<void> {
    const metricHistory = this.metricsCache.get(rule.condition.metric) || [];
    const cutoffTime = Date.now() - rule.condition.timeWindowMs;
    const relevantValues = metricHistory.filter(m => m.timestamp > cutoffTime);

    if (relevantValues.length < rule.condition.minOccurrences) {
      return; // Not enough data points
    }

    // Check condition
    let conditionMet = false;
    const occurrences = relevantValues.filter(m =>
      this.evaluateCondition(rule.condition, m.value)
    ).length;

    if (occurrences >= rule.condition.minOccurrences) {
      conditionMet = true;
    }

    if (conditionMet) {
      // Check cooldown
      const cooldownKey = `rule_${rule.id}`;
      const lastAlertTime = this.alertCooldowns.get(cooldownKey) || 0;

      if (Date.now() - lastAlertTime < rule.cooldownMs) {
        return; // Still in cooldown
      }

      // Create alert
      await this.createAlert(
        rule.type,
        rule.severity,
        `Alert Rule: ${rule.name}`,
        `Condition met: ${rule.condition.metric} ${rule.condition.operator} ${rule.condition.threshold}`,
        `rule_${rule.id}`,
        {
          ruleId: rule.id,
          ruleName: rule.name,
          currentValue,
          threshold: rule.condition.threshold,
          occurrences,
          ...metadata,
        }
      );

      this.alertCooldowns.set(cooldownKey, Date.now());
    }
  }

  private evaluateCondition(condition: AlertCondition, value: number): boolean {
    const threshold =
      typeof condition.threshold === 'number'
        ? condition.threshold
        : parseFloat(condition.threshold);

    switch (condition.operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  private storeMetricValue(metric: string, value: number): void {
    if (!this.metricsCache.has(metric)) {
      this.metricsCache.set(metric, []);
    }

    const values = this.metricsCache.get(metric)!;
    values.push({ value, timestamp: Date.now() });

    // Keep only recent values (last hour)
    const cutoffTime = Date.now() - 3600000;
    const recentValues = values.filter(v => v.timestamp > cutoffTime);
    this.metricsCache.set(metric, recentValues);
  }

  private async sendAlertNotifications(alert: Alert): Promise<void> {
    // Find relevant notification channels
    const relevantChannels = this.notificationChannels.filter(channel => {
      if (!channel.enabled) return false;

      // Check if channel is configured for this alert type/severity
      const channelConfig = channel.config;
      if (
        channelConfig['alertTypes'] &&
        !channelConfig['alertTypes'].includes(alert.type)
      ) {
        return false;
      }
      if (channelConfig['minSeverity']) {
        const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        const alertLevel = severityLevels[alert.severity];
        const minLevel =
          severityLevels[
            channelConfig['minSeverity'] as keyof typeof severityLevels
          ];
        if (alertLevel < minLevel) {
          return false;
        }
      }

      return true;
    });

    // Send notifications
    const notificationPromises = relevantChannels.map(channel =>
      this.sendNotification(channel, alert).catch(error => {
        logger.error('Failed to send notification', {
          channelId: channel.id,
          channelName: channel.name,
          alertId: alert.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      })
    );

    await Promise.allSettled(notificationPromises);
  }

  private async sendNotification(
    channel: NotificationChannel,
    alert: Alert
  ): Promise<void> {
    switch (channel.type) {
      case 'console':
        console.log(
          `[ALERT] ${alert.severity.toUpperCase()}: ${alert.title} - ${alert.message}`
        );
        break;

      case 'webhook':
        await this.sendWebhookNotification(channel, alert);
        break;

      case 'email':
        await this.sendEmailNotification(channel, alert);
        break;

      case 'slack':
        await this.sendSlackNotification(channel, alert);
        break;

      default:
        logger.warn('Unknown notification channel type', {
          type: channel.type,
        });
    }
  }

  private async sendWebhookNotification(
    channel: NotificationChannel,
    alert: Alert
  ): Promise<void> {
    const { url } = channel.config;

    if (!url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      alert: {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        timestamp: alert.timestamp,
        source: alert.source,
        metadata: alert.metadata,
      },
      channel: {
        id: channel.id,
        name: channel.name,
      },
    };

    // In a real implementation, you would use fetch or a HTTP client
    logger.info('Webhook notification would be sent', { url, payload });
  }

  private async sendEmailNotification(
    channel: NotificationChannel,
    alert: Alert
  ): Promise<void> {
    const { to, from, subject } = channel.config;

    logger.info('Email notification would be sent', {
      to,
      from,
      subject: subject || `Alert: ${alert.title}`,
      alert: alert.id,
    });
  }

  private async sendSlackNotification(
    channel: NotificationChannel,
    alert: Alert
  ): Promise<void> {
    const { webhookUrl, channel: slackChannel } = channel.config;

    logger.info('Slack notification would be sent', {
      webhookUrl,
      channel: slackChannel,
      alert: alert.id,
    });
  }

  private scheduleEscalationCheck(alert: Alert): void {
    const escalationTime = 1800000; // 30 minutes default

    setTimeout(() => {
      this.checkEscalation(alert.id);
    }, escalationTime);
  }

  private checkEscalation(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);

    if (!alert || alert.resolved || alert.escalated || alert.acknowledged) {
      return;
    }

    // Escalate alert
    alert.escalated = true;
    alert.escalatedAt = Date.now();

    logger.warn('Alert escalated', { alertId, title: alert.title });
    this.emit('alertEscalated', alert);

    // Send escalation notifications (could be to different channels)
    this.sendAlertNotifications(alert);
  }

  private logAlert(alert: Alert): void {
    const logData = {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      source: alert.source,
      metadata: alert.metadata,
    };

    switch (alert.severity) {
      case 'critical':
        logger.error('Critical alert created', logData);
        break;
      case 'high':
        logger.error('High severity alert created', logData);
        break;
      case 'medium':
        logger.warn('Medium severity alert created', logData);
        break;
      case 'low':
        logger.info('Low severity alert created', logData);
        break;
    }
  }

  private mapErrorSeverity(errorSeverity: string): Alert['severity'] {
    switch (errorSeverity) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  private initializeDefaultRules(): void {
    // High memory usage rule
    this.addAlertRule({
      name: 'High Memory Usage',
      type: 'memory',
      condition: {
        metric: 'memory_usage_percent',
        operator: 'gt',
        threshold: 85,
        timeWindowMs: 300000, // 5 minutes
        minOccurrences: 3,
      },
      severity: 'high',
      enabled: true,
      cooldownMs: 600000, // 10 minutes
      escalationTimeMs: 1800000, // 30 minutes
      notificationChannels: [],
    });

    // High error rate rule
    this.addAlertRule({
      name: 'High Error Rate',
      type: 'error',
      condition: {
        metric: 'error_rate_percent',
        operator: 'gt',
        threshold: 5,
        timeWindowMs: 300000, // 5 minutes
        minOccurrences: 2,
      },
      severity: 'high',
      enabled: true,
      cooldownMs: 300000, // 5 minutes
      escalationTimeMs: 900000, // 15 minutes
      notificationChannels: [],
    });

    // Slow response time rule
    this.addAlertRule({
      name: 'Slow Response Time',
      type: 'performance',
      condition: {
        metric: 'average_response_time_ms',
        operator: 'gt',
        threshold: 2000,
        timeWindowMs: 600000, // 10 minutes
        minOccurrences: 5,
      },
      severity: 'medium',
      enabled: true,
      cooldownMs: 600000, // 10 minutes
      escalationTimeMs: 1800000, // 30 minutes
      notificationChannels: [],
    });
  }

  private initializeDefaultChannels(): void {
    // Console channel (always available)
    this.addNotificationChannel({
      name: 'Console',
      type: 'console',
      config: {
        minSeverity: 'medium',
      },
      enabled: true,
    });
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global alerting manager instance
export const alertingManager = new AlertingManager();
