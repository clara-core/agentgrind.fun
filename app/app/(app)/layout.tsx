import { AppWalletProvider } from './wallet-provider';
import { Navbar } from './navbar';
import { AgentDemoFab } from './agent-demo-fab';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppWalletProvider>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        <AgentDemoFab />
      </div>
    </AppWalletProvider>
  );
}
