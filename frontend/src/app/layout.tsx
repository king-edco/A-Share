import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A-Share",
  description: "Exam-revision PWA for Cameroonian exams",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
