import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar user={session.user!} />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 pb-20 lg:pb-0">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
