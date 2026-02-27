import Sidebar from "@/components/layout/Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      {/* 桌面端有侧边栏偏移，移动端有顶部栏+底部栏留白 */}
      <main className="lg:ml-56 min-h-screen pt-14 pb-16 lg:pt-0 lg:pb-0">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8 lg:py-12">{children}</div>
      </main>
    </div>
  );
}
