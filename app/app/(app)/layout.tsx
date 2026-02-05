import { AppWalletProvider } from './wallet-provider';
import { Navbar } from './navbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppWalletProvider>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </div>
    </AppWalletProvider>
  );
}
