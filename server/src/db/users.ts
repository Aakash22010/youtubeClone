import { doc, one } from '../utils/db';

/**
 * Every column safe to send to a client. password_hash and google_sub are
 * deliberately absent — listing what goes out beats remembering to strip what
 * must not, which is how the old code leaked firebaseUid until a .select()
 * was bolted on in one place.
 */
export const USER_COLUMNS = `
  u.id, u.email, u.display_name, u.photo_url, u.banner, u.description,
  u.is_premium, u.premium_since, u.razorpay_payment_id,
  u.last_download_date, u.daily_download_count,
  u.plan, u.plan_expires_at, u.plan_payment_id, u.total_watch_seconds,
  u.created_at, u.updated_at`;

export interface PublicUser {
  _id: string;
  email: string;
  displayName: string;
  photoURL: string;
  banner: string;
  description: string;
  isPremium: boolean;
  plan: 'free' | 'bronze' | 'silver' | 'gold';
  planExpiresAt: string | null;
  totalWatchSeconds: number;
  dailyDownloadCount: number;
  lastDownloadDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Load a user for a request. Includes the subscriber/subscribedTo id arrays the
 * old Mongo document carried inline, since several client screens read them.
 */
export async function loadUser(id: string): Promise<PublicUser | null> {
  const row = await one(
    `select ${USER_COLUMNS},
            coalesce((select json_agg(s.subscriber_id) from subscriptions s where s.channel_id    = u.id), '[]') as subscribers,
            coalesce((select json_agg(s.channel_id)    from subscriptions s where s.subscriber_id = u.id), '[]') as subscribed_to
       from users u
      where u.id = $1`,
    [id],
  );
  return row ? (doc(row) as PublicUser) : null;
}
