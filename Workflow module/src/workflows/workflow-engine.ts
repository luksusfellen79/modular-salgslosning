// ── Workflow engine: orchestrates commission report lifecycle ──
import { v4 as uuidv4 } from 'uuid';
import { EventBus } from '../events/event-bus.interface';
import { GatewayClient } from '../gateway/gateway-client';
import { generateCommissionReport } from './commission/report-generator';
import { generatePOExport } from './commission/po-exporter';
import { saveReport, loadReport, updateReportStatus, listReports, ReportIndex } from '../storage/report-store';
import { enqueueForApproval } from '../queue/approval-queue';
import { CommissionReport } from './commission/types';
import logger from '../logger';

export class WorkflowEngine {
  constructor(
    private eventBus: EventBus,
    private gatewayClient: GatewayClient
  ) {}

  async runMonthlyCommission(correlationId: string = uuidv4()): Promise<CommissionReport> {
    logger.info('workflow_monthly_commission_start', { correlationId });

    const report = await generateCommissionReport(this.gatewayClient, correlationId);
    saveReport(report);

    await enqueueForApproval(report.id, report.period);

    await this.eventBus.publish('commission_report_created', {
      reportId: report.id,
      period: report.period,
    });

    const recipientEmails = report.agencies.map((a) => a.contactEmail);
    logger.info('approval_notification_sent', {
      correlationId,
      reportId: report.id,
      period: report.period,
      recipientEmails,
    });

    logger.info('workflow_monthly_commission_complete', { correlationId, reportId: report.id });
    return report;
  }

  async approveReport(reportId: string, correlationId: string = uuidv4()): Promise<CommissionReport> {
    const report = updateReportStatus(reportId, 'approved');
    if (!report) throw new Error(`Report not found: ${reportId}`);

    await this.eventBus.publish('commission_report_approved', { reportId, period: report.period });

    generatePOExport(report, correlationId);

    logger.info('workflow_report_approved', { correlationId, reportId, period: report.period });
    return report;
  }

  async rejectReport(
    reportId: string,
    reason: string,
    correlationId: string = uuidv4()
  ): Promise<CommissionReport> {
    const report = updateReportStatus(reportId, 'rejected');
    if (!report) throw new Error(`Report not found: ${reportId}`);

    logger.warn('workflow_report_rejected', { correlationId, reportId, period: report.period, reason });

    await this.eventBus.publish('commission_report_rejected', {
      reportId,
      period: report.period,
      reason,
    });

    return report;
  }

  getReport(reportId: string): CommissionReport | null {
    return loadReport(reportId);
  }

  listReports(): ReportIndex {
    return listReports();
  }
}
