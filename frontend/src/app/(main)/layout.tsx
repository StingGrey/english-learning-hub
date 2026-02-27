import Sidebar from "@/components/layout/Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className="ml-56 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">{children}</div>
      </main>
    </div>
  );
}
