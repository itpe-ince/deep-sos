import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-[calc(100vh-64px)]">{children}</main>
      <Footer />
    </>
  );
}
