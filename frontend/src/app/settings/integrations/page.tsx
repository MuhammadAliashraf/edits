"use client";

import Link from "next/link";
import { ArrowLeft, Instagram } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function IntegrationsPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Link href="/sign-in" className="underline">Sign in required</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-base font-semibold">Integrations</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Instagram className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Instagram</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Instagram publishing is powered by{" "}
            <a href="https://make.com" target="_blank" rel="noopener noreferrer" className="underline">
              Make.com
            </a>
            . No Meta Developer App needed — connect your Instagram account once inside Make.com,
            build a Webhook → Reel scenario, then set{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">MAKE_INSTAGRAM_WEBHOOK_URL</code>{" "}
            on your server.
          </p>
          <Alert>
            <AlertDescription className="text-sm space-y-1">
              <p className="font-medium">Quick setup</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>New Scenario → Webhooks → <strong>Custom webhook</strong> → copy the webhook URL.</li>
                <li>Add module → <strong>Instagram for Business → Create a Reel</strong>.</li>
                <li>In the <strong>Connection</strong> field click <strong>Add</strong> → log in with the Facebook account linked to your Instagram.</li>
                <li>Map <code className="text-xs bg-muted px-1 rounded">{"{{1.video_url}}"}</code> and <code className="text-xs bg-muted px-1 rounded">{"{{1.caption}}"}</code> → Save → Activate.</li>
                <li>Paste the webhook URL into <code className="text-xs bg-muted px-1 rounded">MAKE_INSTAGRAM_WEBHOOK_URL</code> and restart the backend.</li>
              </ol>
              <p className="pt-1">
                Full instructions in the{" "}
                <a
                  href="https://github.com/tass-55/igedits#instagram-publishing-via-makecom"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  README
                </a>.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
