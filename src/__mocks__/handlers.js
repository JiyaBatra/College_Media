export const handlers = [
  rest.get('/api/posts', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 1,
          user: { username: 'testuser' },
          caption: 'Mocked post',
          likes: 10
        }
      ])
    );
  }),

  rest.post('/api/posts/:id/like', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({ success: true, likes: 11 })
    );
  })
];
export const handlers = [
  // Existing post handlers
  rest.get('/api/posts', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 1,
          user: { username: 'testuser' },
          caption: 'Mocked post',
          likes: 10
        }
      ])
    );
  }),

  rest.post('/api/posts/:id/like', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({ success: true, likes: 11 })
    );
  }),

  // Notification handlers
  rest.get('/api/notifications', (req, res, ctx) => {
    return res(
      ctx.delay(500), // Simulate network delay
      ctx.json({
        success: true,
        data: mockNotifications,
        pagination: {
          total: mockNotifications.length,
          limit: 20,
          offset: 0,
          has_more: false
        }
      })
    );
  }),

  rest.put('/api/notifications/:id/read', (req, res, ctx) => {
    const { id } = req.params;
    const notification = mockNotifications.find(n => n.id === id);
    if (notification) {
      notification.isRead = true;
    }
    return res(
      ctx.json({ success: true, message: 'Notification marked as read' })
    );
  }),

  rest.put('/api/notifications/mark-all-read', (req, res, ctx) => {
    mockNotifications.forEach(notification => {
      notification.isRead = true;
    });
    return res(
      ctx.json({ success: true, message: 'All notifications marked as read' })
    );
  }),

  rest.delete('/api/notifications/:id', (req, res, ctx) => {
    const { id } = req.params;
    const index = mockNotifications.findIndex(n => n.id === id);
    if (index > -1) {
      mockNotifications.splice(index, 1);
    }
    return res(
      ctx.json({ success: true, message: 'Notification deleted' })
    );
  }),

  rest.get('/api/notifications/preferences', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          likes: true,
          comments: true,
          follows: true,
          messages: true,
          mentions: true,
          pushEnabled: false,
          soundEnabled: true
        }
      })
    );
  }),

  rest.put('/api/notifications/preferences', async (req, res, ctx) => {
    const preferences = await req.json();
    return res(
      ctx.json({
        success: true,
        data: preferences,
        message: 'Preferences updated successfully'
      })
    );
  }),

  // Real-time notification simulation (WebSocket-like)
  rest.post('/api/notifications/simulate', (req, res, ctx) => {
    const types = ['like', 'comment', 'follow', 'message'];
    const actors = [
      { id: 'user1', username: 'traveler_adventures', profilePicture: 'https://placehold.co/40x40/FF6B6B/FFFFFF?text=TA' },
      { id: 'user2', username: 'foodie_delights', profilePicture: 'https://placehold.co/40x40/45B7D1/FFFFFF?text=FD' },
      { id: 'user3', username: 'fitness_motivation', profilePicture: 'https://placehold.co/40x40/96CEB4/FFFFFF?text=FM' },
      { id: 'user4', username: 'friend_one', profilePicture: 'https://placehold.co/40x40/96CEB4/FFFFFF?text=F1' }
    ];

    const type = types[Math.floor(Math.random() * types.length)];
    const actor = actors[Math.floor(Math.random() * actors.length)];

    let content = '';
    switch (type) {
      case 'like':
        content = 'liked your post';
        break;
      case 'comment':
        content = 'commented on your post';
        break;
      case 'follow':
        content = 'started following you';
        break;
      case 'message':
        content = 'sent you a message';
        break;
      default:
        content = 'interacted with your content';
    }

    const newNotification = {
      id: Date.now().toString(),
      type,
      actor,
      target: { type: 'post', id: 'mock' },
      content,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    mockNotifications.unshift(newNotification);

    return res(
      ctx.json({
        success: true,
        data: newNotification,
        message: 'New notification simulated'
      })
    );
  })
];
