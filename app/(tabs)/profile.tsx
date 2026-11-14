import { Screen } from '@/components/ui';
import { useSession } from '@/stores/session';
import { ProfileContent } from '@/components/ProfileContent';

export default function OwnProfileScreen() {
  const user = useSession((s) => s.user);
  if (!user) return null;

  return (
    <Screen>
      <ProfileContent username={user.username} isOwn />
    </Screen>
  );
}
