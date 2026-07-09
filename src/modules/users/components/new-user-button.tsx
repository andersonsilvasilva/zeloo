"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserFormDialog } from "@/modules/users/components/user-form-dialog";
import type { UserFormOptions } from "@/modules/users/types/user.types";

export function NewUserButton({ options, currentUserId }: { options: UserFormOptions; currentUserId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo usuário
      </Button>
      <UserFormDialog
        open={open}
        onOpenChange={setOpen}
        options={options}
        mode="create"
        currentUserId={currentUserId}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
