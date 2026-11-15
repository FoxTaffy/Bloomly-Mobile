export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_video_url: string | null;
  bio: string | null;
  status: string | null;
  is_verified: boolean;
  verification_type: string | null;
  badge_type: string | null;
  email_verified: boolean;
  onboarding_done: boolean;
  /** Сервер проверяет 18+ по дате рождения; без этого NSFW недоступен (как на вебе, useNsfwMode). */
  is_adult?: boolean;
  /** Тариф: определяет лимиты загрузки (free, lite, pro, business). */
  subscription_tier?: string | null;
  /** Второй фактор входа и есть ли пароль (у входа через соцсеть пароля нет). */
  two_factor_method?: 'totp' | 'email' | null;
  has_password?: boolean;
}

export interface PostAuthor {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  verification_type: string | null;
  role?: string;
}

export interface Post {
  id: string;
  content: string | null;
  author_id: string;
  rating: number;
  is_nsfw: boolean;
  is_announcement: boolean;
  subscriber_only: boolean;
  created_at: string;
  updated_at: string;
  category: string | null;
  title: string | null;
  post_type: string;
  media_urls: string[];
  media_original_urls: string[];
  author: PostAuthor | null;
  rewardForUser: PostAuthor | null;
  tags: { tag: { id: string; name: string } }[];
  _count: { votes: number; repaws: number; comments: number };
  my_vote?: -1 | 0 | 1;
  /** Состояние читателя из /posts/status (web: loadViewerState). */
  repawed?: boolean;
  favourited?: boolean;
  comments_disabled?: boolean;
  is_ai_generated?: boolean;
  is_archived?: boolean;
  /** Только на клиенте: «Не интересно» — карточка свёрнута до отмены (web: PostCard isHidden). */
  hidden_by_me?: boolean;
  groupPosts?: { group: { id: string; slug: string; name: string; avatar_url: string | null; accent_color: string | null } }[];
}

export interface Story {
  id: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  expires_at: string;
  user: { id: string; username: string; display_name: string | null; avatar_url: string | null };
  score: number;
  my_vote: -1 | 0 | 1;
  view_count: number;
}

export interface StoryViewer {
  id: string;
  created_at: string;
  user: { id: string; username: string; display_name: string | null; avatar_url: string | null };
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_video_url: string | null;
  banner_url: string | null;
  pronouns: string | null;
  /** Поля ниже сервер отдаёт владельцу профиля (и тем, кому позволяет приватность). */
  location?: string | null;
  website?: string | null;
  likes?: string[];
  dislikes?: string[];
  likes_dislikes_visible?: boolean;
  /** Закреплённый пост: id и краткое содержимое (поля поста неполные: без состояния читателя). */
  pinned_post_id?: string | null;
  pinnedPost?: Post | null;
  profile_visibility?: 'everyone' | 'friends' | 'only_me';
  friends_list_visibility?: 'everyone' | 'friends' | 'only_me';
  messages_privacy?: 'everyone' | 'friends' | 'nobody';
  comments_privacy?: 'everyone' | 'friends' | 'nobody';
  mentions_privacy?: 'everyone' | 'friends' | 'nobody';
  online_status_visibility?: 'everyone' | 'friends' | 'nobody';
  fursona_name: string | null;
  fursona_color: string | null;
  fursona_description: string | null;
  interests: string[];
  is_verified: boolean;
  verification_type: string | null;
  badge_type: string | null;
  badge_level?: string | null;
  _count: { followers: number; following: number; posts: number };
  is_private?: boolean;
  is_following?: boolean;
  /** Аккаунт заморожен (бейдж-снежинка, как на вебе). */
  frozen_at?: string | null;
  /** Этот пользователь заблокировал вас. */
  is_blocked_by_user?: boolean;
}

/** Участник беседы как отдаёт сервер: короткая карточка пользователя. */
export interface ChatUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Беседа в списке (`GET /messages/conversations`). Форма как у веба (stores/messages.ts): собеседники — `other_participants[].user`,
 * мои настройки — `my_participant`. Поле `participants` на сервере — строки участников (`{ user_id, user }`), не пользователи.
 */
export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'community' | 'order';
  is_group: boolean;
  name: string | null;
  avatar_url: string | null;
  unread_count: number;
  last_message: Message | null;
  participants?: { user_id: string; user: ChatUser }[];
  other_participants: { user_id: string; user: ChatUser }[];
  participants_count?: number;
  /** Личный диалог между не-друзьями: pending — заявка ждёт ответа. */
  request_status?: 'pending' | 'accepted' | 'declined' | null;
  request_from_id?: string | null;
  /** Рабочий чат закрыт (сделка завершена или отменена). */
  read_only_at?: string | null;
  updated_at?: string;
  my_participant?: {
    archived: boolean;
    pinned_at?: string | null;
    muted_until?: string | null;
    sound_muted?: boolean;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string | null;
  encrypted_text: string | null;
  /** text, voice, audio, sticker, album, post_share, group_share, system; платёжные и заказные карточки приходят тоже (в приложении — безопасная плашка). */
  type: string;
  file_url: string | null;
  reactions: Record<string, string[]> | null;
  reply_to_id: string | null;
  reply_to?: { id: string; text: string | null; type: string; file_url: string | null; sender?: { id: string; username: string; display_name: string | null } | null } | null;
  edited_at?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Автор пересланного сообщения (если его настройки позволяют показать). */
  forwarded_from_sender_id?: string | null;
  forwarded_from_sender?: { id: string; username: string; display_name: string | null } | null;
  created_at: string;
  sender?: { id: string; username: string; display_name: string | null; avatar_url: string | null };
}

export interface Group {
  id: string;
  slug: string;
  name: string;
  avatar_url: string | null;
  banner_url: string | null;
  accent_color: string | null;
  members_count: number;
  description: string | null;
  /** Тип группы (event, creative, static, news, shop, community, brand): определяет, какие разделы показывает веб. */
  type?: string;
  owner_id?: string;
  /** Закрытая группа: вступление — по заявке. */
  is_public?: boolean;
  /** Группа 18+: показывается только при включённом режиме NSFW (как посты). */
  is_nsfw?: boolean;
  is_verified?: boolean;
  about_text?: string | null;
  rules_text?: string | null;
  faq?: { q: string; a: string }[] | null;
  reviews_avg?: number;
  reviews_count?: number;
}

export interface GroupEvent {
  id: string;
  group_id: string;
  title: string;
  short_code: string;
  description: string | null;
  banner_url: string | null;
  location_name: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  attendee_count: number;
  is_top: boolean;
  group?: Group;
}

export interface EventAttendee {
  event_id: string;
  user_id: string;
  status: 'going' | 'maybe' | 'not_going';
  user: { id: string; username: string; display_name: string | null; avatar_url: string | null };
}

export interface AppNotification {
  id: string;
  receiver_id: string;
  sender_id: string | null;
  type: string;
  post_id: string | null;
  comment_id: string | null;
  ref_id: string | null;
  read: boolean;
  created_at: string;
  meta: Record<string, unknown> | null;
  sender: { id: string; username: string; display_name: string | null; avatar_url: string | null; badge_type: string | null } | null;
}

/** Человек в списках «Друзья / Подписчики / Подписки» и рекомендациях (веб: FriendUser). */
export interface FriendUser extends Omit<UserSummary, 'is_verified' | 'verification_type'> {
  location: string | null;
  deceased_at: string | null;
  is_following?: boolean;
  /** Только у друзей: онлайн ли сейчас. */
  online?: boolean;
  /** Сколько моих друзей знакомы с этим человеком (рекомендации). */
  mutual_count?: number;
}

export interface UserSummary {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  verification_type: string | null;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author_id?: string;
  rating?: number;
  user_vote?: -1 | 0 | 1;
  author: PostAuthor | null;
  group: { id: string; slug: string; name: string; avatar_url: string | null } | null;
  _count: { replies: number };
  replies?: Comment[];
}

/** Страница ответа с курсором: `nextCursor === null` — страниц больше нет (как на вебе, lib/feed.ts). */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/** Режим показа NSFW (web: composables/useNsfwMode). Несовершеннолетним и гостям всегда 'hide'. */
export type NsfwMode = 'hide' | 'blur' | 'show';
