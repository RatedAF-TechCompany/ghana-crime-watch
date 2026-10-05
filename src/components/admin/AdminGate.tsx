'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';

/** Renders nothing until a staff session is confirmed; otherwise redirects to /auth. */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth'); return; }
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id);
      const staff = (roles ?? []).some((r) => ['admin', 'editor', 'contributor'].includes(r.role));
      if (!staff) { router.replace('/auth'); return; }
      if (active) setOk(true);
    })();
    return () => { active = false; };
  }, [router]);

  if (!ok) return null;
  return <>{children}</>;
}
