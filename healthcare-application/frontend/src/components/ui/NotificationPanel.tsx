import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../api/services';
import { Icon } from './Icon';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import type { Notification } from '../../types';
import './NotificationPanel.css';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationCountChange?: (count: number) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  onNotificationCountChange,
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'care_gap' | 'referral' | 'clinical' | 'emergency'>('all');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const loadNotifications = () => {
    notificationApi.list()
      .then((data) => {
        setNotifications(data);
        const unread = data.filter((n) => !n.is_read).length;
        onNotificationCountChange?.(unread);
      })
      .catch(() => {
        const seedNotifications: Notification[] = [
          {
            id: 'notif-01',
            notification_type: 'care_gap',
            title: 'Care gap identified',
            message: 'Ramesh Kumar requires follow-up for persistent respiratory symptoms (3 weeks).',
            is_read: false,
            created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
          },
          {
            id: 'notif-02',
            notification_type: 'referral',
            title: 'Referral accepted',
            message: 'Varanasi District Hospital accepted referral REF-RAMESH-2026-CHEST for Pulmonology OPD.',
            is_read: false,
            created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          },
          {
            id: 'notif-03',
            notification_type: 'clinical',
            title: 'X-ray reviewed',
            message: 'Dr. Rajesh Sharma completed clinical review. Infiltration confirmed (67.3% MedFed AI confidence).',
            is_read: false,
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          },
          {
            id: 'notif-04',
            notification_type: 'emergency',
            title: 'Emergency protocol audited',
            message: 'Break-glass access query logged to immutable ledger for trauma triage.',
            is_read: true,
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
          },
        ];
        setNotifications(seedNotifications);
        onNotificationCountChange?.(seedNotifications.filter((n) => !n.is_read).length);
      });
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
    } catch {
      // Mock fallback
    }
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      onNotificationCountChange?.(updated.filter((n) => !n.is_read).length);
      return updated;
    });
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, is_read: true }));
      onNotificationCountChange?.(0);
      return updated;
    });
  };

  const handleNotificationClick = (item: Notification) => {
    handleMarkAsRead(item.id);
    onClose();

    if (item.notification_type === 'referral') {
      navigate('/mo/referrals');
    } else if (item.notification_type === 'clinical' || item.title.toLowerCase().includes('x-ray')) {
      navigate('/mo/chest-xray');
    } else if (item.notification_type === 'care_gap') {
      navigate('/mo/predictions');
    } else {
      navigate('/mo');
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await notificationApi.sendEmail({
        recipient_email: 'sihdori7@gmail.com',
        template_type: 'FOLLOW_UP_REMINDER',
        patient_name: 'Ramesh Kumar',
        details: {
          facility: 'Varanasi District Hospital',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          diagnosis: 'Bacterial Community-Acquired Pneumonia (Infiltration)',
          instructions: 'Complete antibiotic course and report to Shampur PHC for repeat auscultation.',
        },
      });

      if (res.success) {
        setEmailStatus(`SMTP Email successfully sent to ${res.recipient}!`);
      } else {
        setEmailStatus(`Email dispatched: ${res.message}`);
      }
      setTimeout(() => setEmailStatus(null), 5000);
    } catch (err: any) {
      setEmailStatus('SMTP service temporarily unavailable or offline simulation.');
      setTimeout(() => setEmailStatus(null), 4000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    return n.notification_type === activeFilter;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="notification-panel-backdrop" onClick={onClose}>
      <aside
        className="notification-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Notification Center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notif-header">
          <div className="notif-title-wrap">
            <Icon name="alert" size={18} color="var(--color-primary, #0f766e)" />
            <h3 className="notif-title">Operational Notifications</h3>
            {unreadCount > 0 && <span className="notif-unread-count">{unreadCount}</span>}
          </div>
          <button className="notif-close-btn" onClick={onClose} aria-label="Close notification panel">
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Real SMTP Dispatch Banner */}
        <div className="notif-smtp-banner">
          <div className="smtp-info">
            <Icon name="send" size={14} color="var(--color-primary, #0f766e)" />
            <span>SMTP Alerts: <code>sihdori7@gmail.com</code></span>
          </div>
          <Button
            variant="outline"
            size="sm"
            isLoading={isSendingEmail}
            onClick={handleSendTestEmail}
          >
            Send Test Alert
          </Button>
        </div>

        {emailStatus && (
          <div className="notif-email-feedback" role="status">
            <Icon name="check" size={14} />
            <span>{emailStatus}</span>
          </div>
        )}

        {/* Filter Pills */}
        <div className="notif-filter-bar">
          <button
            className={`notif-filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={`notif-filter-chip ${activeFilter === 'care_gap' ? 'active' : ''}`}
            onClick={() => setActiveFilter('care_gap')}
          >
            Care Gaps
          </button>
          <button
            className={`notif-filter-chip ${activeFilter === 'referral' ? 'active' : ''}`}
            onClick={() => setActiveFilter('referral')}
          >
            Referrals
          </button>
          <button
            className={`notif-filter-chip ${activeFilter === 'clinical' ? 'active' : ''}`}
            onClick={() => setActiveFilter('clinical')}
          >
            Clinical
          </button>
        </div>

        {/* Notification List */}
        <div className="notif-list">
          {filtered.length === 0 ? (
            <div className="notif-empty-state">
              <Icon name="check" size={24} color="var(--color-text-tertiary, #94a3b8)" />
              <p>No operational notifications in this category</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`notif-card ${item.is_read ? 'read' : 'unread'}`}
                onClick={() => handleNotificationClick(item)}
                title="Click to view related clinical event / patient"
              >
                <div className="notif-card-header">
                  <StatusBadge
                    status={
                      item.notification_type === 'emergency'
                        ? 'urgent'
                        : item.notification_type === 'care_gap'
                        ? 'high-priority'
                        : 'active'
                    }
                    label={item.notification_type.replace('_', ' ').toUpperCase()}
                    size="sm"
                  />
                  <span className="notif-time">
                    {new Date(item.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <h4 className="notif-item-title">{item.title}</h4>
                <p className="notif-item-message">{item.message}</p>
                {!item.is_read && (
                  <span className="unread-dot" aria-label="Unread notification" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {unreadCount > 0 && (
          <div className="notif-footer">
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              Mark all as read
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
};
