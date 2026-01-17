import { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../context/NotificationContext';
import NotificationItem from './NotificationItem';
import { notificationsApi } from '../api/endpoints';
import { toast } from 'react-hot-toast';

const NotificationCenter = () => {
  const { t } = useTranslation();
  const {
    notifications: contextNotifications,
    unreadCount,
    markAllAsRead,
    clearAll,
    loading: contextLoading
  } = useNotifications();

  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Load more notifications with pagination
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      const data = await notificationsApi.getAll({
        page: page + 1,
        limit: 20,
        type: filter !== 'all' ? filter : undefined
      });

      if (data.notifications.length === 0) {
        setHasMore(false);
      } else {
        setNotifications(prev => [...prev, ...data.notifications]);
        setPage(prev => prev + Page + 1);
      }
    } catch (error) {
      console.error('Failed to load more notifications:', error);
      toast.error(t('notifications.failedLoadMore'));
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, filter, t]);

  // Reset notifications when filter changes
  useEffect(() => {
    setNotifications(
      filter === 'all'
        ? contextNotifications
        : contextNotifications.filter(n => n.type === filter)
    );
    setPage(1);
    setHasMore(true);
  }, [filter, contextNotifications]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 500
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, page, filter, loadMore]);

  const filters = useMemo(() => [
    { value: 'all', label: t('notifications.filters.all'), icon: 'mdi:bell' },
    { value: 'like', label: t('notifications.filters.like'), icon: 'mdi:heart' },
    { value: 'comment', label: t('notifications.filters.comment'), icon: 'mdi:comment' },
    { value: 'follow', label: t('notifications.filters.follow'), icon: 'mdi:account-plus' },
    { value: 'mention', label: t('notifications.filters.mention'), icon: 'mdi:at' },
    { value: 'share', label: t('notifications.filters.share'), icon: 'mdi:share-variant' },
    { value: 'reply', label: t('notifications.filters.reply'), icon: 'mdi:reply' },
  ], [t]);

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-bg-secondary rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Icon icon="mdi:bell" width={28} />
              {t('notifications.title')}
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-500 text-white text-sm rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>

            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 text-sm font-medium text-brand-primary hover:bg-bg-tertiary rounded-lg transition-colors"
                >
                  {t('notifications.markAllRead')}
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm(t('notifications.confirmClearAll'))) {
                      clearAll();
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  {t('notifications.clearAll')}
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filter === f.value
                    ? 'bg-brand-primary text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary'
                  }`}
              >
                <Icon icon={f.icon} width={18} />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-bg-secondary rounded-lg shadow-sm border border-border overflow-hidden">
          {contextLoading ? (
            <div className="flex items-center justify-center py-12">
              <Icon icon="mdi:loading" width={32} className="animate-spin text-brand-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Icon
                icon="mdi:bell-outline"
                width={64}
                className="text-text-muted mb-4"
              />
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {t('notifications.noNotifications')}
              </h3>
              <p className="text-text-muted text-center max-w-sm">
                {filter === 'all'
                  ? t('notifications.allCaughtUp')
                  : t('notifications.noFilteredNotifications', { type: t(`notifications.filters.${filter}`).toLowerCase() })}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                  />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="p-4 text-center border-t border-border">
                  {loading ? (
                    <Icon icon="mdi:loading" width={24} className="animate-spin text-brand-primary mx-auto" />
                  ) : (
                    <button
                      onClick={loadMore}
                      className="text-brand-primary hover:underline font-medium"
                    >
                      {t('notifications.loadMore')}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;

