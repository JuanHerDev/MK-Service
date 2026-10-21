"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
    else if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  return (
    <main className="grid min-h-screen place-items-center">
      <Loader label="Iniciando sistema" />
    </main>
  );
}
