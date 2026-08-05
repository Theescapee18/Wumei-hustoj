import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import ConditionalLayout from "@/components/ConditionalNav";
import BootstrapClient from "@/components/BootstrapClient";

const OJ_NAME = process.env.NEXT_PUBLIC_OJ_NAME || 'Online Judge';

export const metadata: Metadata = {
  title: OJ_NAME,
  description: "Premium Online Judge System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
        <BootstrapClient />
      </body>
    </html>
  );
}
