import { notificationRepository } from '../repositories/notification.repository';
import { auditService } from './audit.service';
import { AuditAction } from '../types/audit';
import { NotFoundError } from '../errors';

export class NotificationService {
  async triggerNotification(
    recipientId: string,
    senderId: string | null,
    title: string,
    content: string,
    type: 'info' | 'success' | 'warning' | 'danger' | 'critical' | 'reminder' | 'approval' | 'system' | 'security' = 'info',
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    actionUrl: string | null = null,
    icon: string | null = null,
    metadata: any = {}
  ): Promise<any> {
    const notification = await notificationRepository.create({
      recipient_id: recipientId,
      sender_id: senderId,
      title,
      content,
      type,
      priority,
      action_url: actionUrl,
      icon,
      metadata,
    });

    if (notification) {
      await auditService.log(
        AuditAction.NOTIFICATION_GENERATED,
        {
          actorId: senderId || '00000000-0000-0000-0000-000000000000',
          metadata: { notificationId: notification.id, recipientId },
        }
      );
    }

    return notification;
  }

  async getInbox(
    recipientId: string,
    options: { limit?: number; offset?: number; type?: string; priority?: string; archived?: boolean } = {}
  ): Promise<any[]> {
    return notificationRepository.findByRecipient(recipientId, options);
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return notificationRepository.getUnreadCount(recipientId);
  }

  async markAsRead(actorId: string, id: string, req?: any): Promise<any> {
    const existing = await notificationRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Notification not found');
    }

    const updated = await notificationRepository.markAsRead(id);

    await auditService.log(
      AuditAction.NOTIFICATION_READ,
      {
        actorId,
        metadata: { notificationId: id },
        req,
      }
    );

    return updated;
  }

  async markAllAsRead(actorId: string, req?: any): Promise<void> {
    await notificationRepository.markAllAsRead(actorId);

    await auditService.log(
      AuditAction.NOTIFICATION_READ,
      {
        actorId,
        metadata: { all: true },
        req,
      }
    );
  }

  async archiveNotification(actorId: string, id: string, archived: boolean = true, req?: any): Promise<any> {
    const existing = await notificationRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Notification not found');
    }

    const updated = await notificationRepository.archive(id, archived);

    await auditService.log(
      AuditAction.NOTIFICATION_ARCHIVED,
      {
        actorId,
        metadata: { notificationId: id, archived },
        req,
      }
    );

    return updated;
  }

  async deleteNotification(id: string): Promise<void> {
    const existing = await notificationRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Notification not found');
    }

    await notificationRepository.delete(id);
  }

  // ── Automatic Notification Router ──────────────────────────────────────────
  async handleEvent(
    event:
      | 'announcement_published'
      | 'employee_created'
      | 'department_changed'
      | 'password_changed'
      | 'role_updated'
      | 'profile_updated'
      | 'tournament_published'
      | 'document_shared'
      | 'ticket_assigned'
      | 'system_maintenance',
    recipientId: string,
    metadata: any = {}
  ): Promise<any> {
    let title = '';
    let content = '';
    let type: 'info' | 'success' | 'warning' | 'danger' | 'critical' | 'reminder' | 'approval' | 'system' | 'security' = 'info';
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let icon = 'bell';

    switch (event) {
      case 'announcement_published':
        title = 'New Announcement';
        content = metadata.title || 'A new announcement has been published.';
        type = 'info';
        icon = 'megaphone';
        break;
      case 'employee_created':
        title = 'Profile Created';
        content = 'Welcome to the team! Your employee profile has been created.';
        type = 'success';
        icon = 'user-check';
        break;
      case 'department_changed':
        title = 'Department Transfer';
        content = `Your department transfer to ${metadata.department_name || 'new department'} is complete.`;
        type = 'info';
        icon = 'git-pull-request';
        break;
      case 'password_changed':
        title = 'Password Updated';
        content = 'Your password has been changed successfully. If you did not do this, please contact IT immediately.';
        type = 'security';
        priority = 'high';
        icon = 'shield-alert';
        break;
      case 'role_updated':
        title = 'Access Permissions Updated';
        content = `Your corporate access role has been updated to: ${metadata.role || 'new role'}.`;
        type = 'security';
        priority = 'high';
        icon = 'key';
        break;
      case 'profile_updated':
        title = 'Profile Sync Update';
        content = 'Your employee profile information was synchronized.';
        type = 'info';
        icon = 'refresh-cw';
        break;
      case 'tournament_published':
        title = 'Tournament Published';
        content = `A new tournament is active: ${metadata.name || 'Tournament'}. Join and compete!`;
        type = 'info';
        icon = 'trophy';
        break;
      case 'document_shared':
        title = 'Document Shared';
        content = `A new document "${metadata.name || 'Document'}" was shared with you.`;
        type = 'info';
        icon = 'file-text';
        break;
      case 'ticket_assigned':
        title = 'Support Ticket Assigned';
        content = `Support ticket #${metadata.ticket_number || 'Ticket'} is assigned to you.`;
        type = 'reminder';
        icon = 'help-circle';
        break;
      case 'system_maintenance':
        title = 'Scheduled System Maintenance';
        content = `The intranet will undergo maintenance on: ${metadata.date || 'scheduled date'}.`;
        type = 'warning';
        priority = 'high';
        icon = 'tool';
        break;
    }

    return this.triggerNotification(
      recipientId,
      null, // Sender is System
      title,
      content,
      type,
      priority,
      metadata.action_url || null,
      icon,
      metadata
    );
  }
}

export const notificationService = new NotificationService();
