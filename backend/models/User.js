/* ============================================================
   📊 DATABASE INDEXES (OPTIMIZED FOR LARGE COLLECTIONS)
   ============================================================ */

/**
 * NOTE:
 * - username & email already have `unique: true`
 * - Mongoose automatically creates indexes for them
 * - So manual index duplication is avoided
 */

/* -------------------------
   🔍 FILTERING INDEXES
------------------------- */

// Soft delete & active users (very common)
userSchema.index(
  { isDeleted: 1, isActive: 1 },
  { name: "idx_active_non_deleted_users" }
);

// Role-based filtering (admin / alumni / student dashboards)
userSchema.index(
  { role: 1, isActive: 1, isDeleted: 1 },
  { name: "idx_role_active_users" }
);

/* -------------------------
   ⏱ SORTING INDEXES
------------------------- */

// Recent users listing
userSchema.index(
  { createdAt: -1 },
  { name: "idx_users_created_desc" }
);

/* -------------------------
   🔎 LOOKUP INDEXES
------------------------- */

// Username lookup excluding deleted users
userSchema.index(
  { username: 1, isDeleted: 1 },
  {
    name: "idx_username_lookup_active",
    partialFilterExpression: { isDeleted: false }
  }
);

// OAuth users lookup
userSchema.index(
  { googleId: 1 },
  {
    name: "idx_google_oauth_users",
    sparse: true
  }
);

userSchema.index(
  { githubId: 1 },
  {
    name: "idx_github_oauth_users",
    sparse: true
  }
);

/* -------------------------
   👥 SOCIAL GRAPH INDEXES
------------------------- */

// Followers / Following lookups (important for large graphs)
userSchema.index(
  { followers: 1 },
  { name: "idx_user_followers" }
);

userSchema.index(
  { following: 1 },
  { name: "idx_user_following" }
);

/* -------------------------
   📝 TEXT SEARCH INDEX
------------------------- */

userSchema.index(
  {
    username: "text",
    firstName: "text",
    lastName: "text",
    bio: "text"
  },
  {
    name: "idx_user_text_search",
    weights: {
      username: 10,
      firstName: 5,
      lastName: 5,
      bio: 1
    }
  }
);

/* -------------------------
   ⚠️ PERFORMANCE NOTES
-------------------------

✔ Avoided duplicate unique indexes
✔ Used partialFilterExpression to reduce index size
✔ Optimized for:
   - large user collections
   - soft delete pattern
   - dashboards & feeds
✔ Safe for millions of documents

------------------------------------------------------------ */
