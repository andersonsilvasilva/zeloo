"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TenantFormDialog } from "@/modules/tenancy/components/tenant-form-dialog";

export function NewTenantButton({ baseDomain }: { baseDomain: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{ slug: string; url: string } | null>(null);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo tenant
      </Button>
      <TenantFormDialog
        open={open}
        onOpenChange={setOpen}
        baseDomain={baseDomain}
        onSuccess={(result) => {
          setOpen(false);
          setCreated(result);
          router.refresh();
        }}
      />
      {created && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-success/40 bg-card p-4 shadow-xl">
          <p className="text-sm font-medium text-text">Tenant "{created.slug}" criado.</p>
          <p className="mt-1 text-xs text-text-secondary break-all">{created.url}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setCreated(null)}>
            Fechar
          </Button>
        </div>
      )}
    </>
  );
}
