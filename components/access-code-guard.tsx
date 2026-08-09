'use client';

import { useEffect, useState, ReactNode } from 'react';
import { AccessCodeModal } from '@/components/access-code-modal';

export function AccessCodeGuard({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<{
    enabled: boolean;
    authenticated: boolean;
    loading: boolean;
  }>({ enabled: false, authenticated: false, loading: true });

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      try {
        const res = await fetch('/api/access-code/status');
        const data = await res.json();
        if (cancelled) return;
        setStatus({
          enabled: data.enabled,
          authenticated: data.authenticated,
          loading: false,
        });
      } catch {
        if (cancelled) return;
        // Default to requiring auth on error — safer than silently disabling
        setStatus({ enabled: true, authenticated: false, loading: false });
      }
    }

    async function autoVerifyFromUrl(): Promise<boolean> {
      if (typeof window === 'undefined') return false;
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code') || params.get('access_code');
      if (!code) return false;

      try {
        const res = await fetch('/api/access-code/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        if (!res.ok) return false;

        // Remove code from URL without reloading the page.
        params.delete('code');
        params.delete('access_code');
        const newQuery = params.toString();
        const newUrl =
          window.location.pathname +
          (newQuery ? `?${newQuery}` : '') +
          window.location.hash;
        window.history.replaceState({}, '', newUrl);

        if (!cancelled) {
          setStatus({ enabled: true, authenticated: true, loading: false });
        }
        return true;
      } catch {
        return false;
      }
    }

    async function bootstrap() {
      const verified = await autoVerifyFromUrl();
      // Only fall back to the status endpoint if URL auto-verify did not succeed.
      if (!cancelled && !verified) {
        await checkStatus();
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const needsAuth = !status.loading && status.enabled && !status.authenticated;

  // Block rendering children until we know the auth state.
  // This prevents the classroom page from firing API requests before the
  // access-code cookie has been set via the URL ?code=... auto-verify flow.
  if (status.loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center text-muted-foreground">
          <p>Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {needsAuth && (
        <AccessCodeModal
          open={true}
          onSuccess={() => setStatus((s) => ({ ...s, authenticated: true }))}
        />
      )}
      {children}
    </>
  );
}
