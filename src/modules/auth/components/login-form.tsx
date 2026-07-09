"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/modules/auth/schemas/login.schema";
import { loginAction } from "@/modules/auth/actions/login.action";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (input: LoginInput) => {
    setFormError(null);
    const result = await loginAction(input);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl") ?? "/";
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm text-text-secondary">
          E-mail
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          {...register("email")}
        />
        {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm text-text-secondary">
          Senha
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && <p className="text-sm text-danger">{errors.password.message}</p>}
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
