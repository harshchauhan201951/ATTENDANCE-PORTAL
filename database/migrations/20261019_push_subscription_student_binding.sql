-- A single browser/PWA/FCM endpoint belongs to the student who most recently
-- authenticated on that install. Remove legacy duplicate bindings first.
delete from public.push_subscriptions older
using public.push_subscriptions newer
where older.endpoint = newer.endpoint
  and older.id < newer.id;

create unique index if not exists push_subscriptions_endpoint_unique
  on public.push_subscriptions (endpoint);
