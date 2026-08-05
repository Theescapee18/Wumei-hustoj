import AdminNavigation from "@/components/AdminNavigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminNavigation />
      <main style={{ paddingTop: '64px', minHeight: '100vh' }}>
        {children}
      </main>
    </>
  );
}
