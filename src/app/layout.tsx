import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Collaborative ToDo",
  description: "Simple shared todo lists with live collaboration",
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("todo-theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
