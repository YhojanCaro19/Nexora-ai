// components/dashboard/DashboardLayout.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, FileText, Settings, 
  LogOut, Bell, Menu, ChevronDown 
} from 'lucide-react';

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { label: 'Panel de Control', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Usuarios', icon: Users, href: '/dashboard/users' },
    { label: 'Finanzas', icon: FileText, href: '/dashboard/finances' },
    { label: 'Configuración', icon: Settings, href: '/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 flex">
      {/* BARRA LATERAL (Sidebar) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-zinc-800/50 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static`}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8 pl-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
            <span className="text-xl font-bold tracking-tight text-white uppercase">NEXORA</span>
          </div>

          {/* Menú */}
          <nav className="flex-1 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium
                    ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Cerrar Sesión */}
          <button className="flex items-center gap-3 text-zinc-400 hover:text-red-400 transition-colors text-sm mt-auto pl-2">
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-md border-b border-zinc-800/50 p-4 px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-zinc-400 hover:text-white">
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-semibold text-white">
              {menuItems.find(item => item.href === pathname)?.label || 'Panel'}
            </h1>
          </div>

          {/* Notificaciones + Avatar */}
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-2 cursor-pointer p-1.5 pr-3 rounded-full hover:bg-zinc-800 transition-colors border border-zinc-800/50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                A
              </div>
              <span className="text-sm font-medium hidden md:block text-zinc-300">Admin</span>
              <ChevronDown size={14} className="text-zinc-500" />
            </div>
          </div>
        </header>

        {/* CONTENIDO DEL DASHBOARD */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Overlay para cerrar menú en móvil */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};