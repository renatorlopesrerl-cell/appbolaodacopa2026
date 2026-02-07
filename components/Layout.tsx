import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Calendar, Users, LogOut, Menu, X, Settings, Check, Bell, Info, User, Mail, WifiOff } from 'lucide-react';
import { useStore } from '../App';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, notifications, removeNotification, invitations, leagues, users, connectionError, retryConnection, isRecoveryMode } = useStore();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Determine if we should show the full layout (Standard authenticated view)
  // We must calculate this but NOT return early to avoid Hook Rule violations
  const isMinimalLayout = isRecoveryMode || location.pathname === '/reset-password' || !currentUser;

  const notificationRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path ? 'bg-brasil-yellow text-brasil-blue font-bold' : 'text-white hover:bg-white/10';

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isMinimalLayout) {
    return <div className="dark:bg-gray-900 min-h-screen">{children}</div>;
  }

  // Count direct invites to the user
  const pendingInvites = invitations.filter(i => i.status === 'pending');

  // Count pending requests in leagues where the current user is Admin
  const adminLeaguesWithRequests = leagues
    .filter(l => l.adminId === currentUser.id && l.pendingRequests.some(uid => users.some(u => u.id === uid)));

  const pendingLeagueRequestsCount = adminLeaguesWithRequests
    .reduce((acc, l) => {
      const validRequests = l.pendingRequests.filter(uid => users.some(u => u.id === uid));
      return acc + validRequests.length;
    }, 0);

  const totalNotifications = pendingInvites.length + pendingLeagueRequestsCount;

  const renderNotificationDropdown = () => (
    <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 z-[100] animate-in fade-in slide-in-from-top-2 origin-top-right">
      <div className="p-3 bg-brasil-blue text-white font-bold text-sm flex justify-between items-center shadow-md relative z-10">
        <span>Notificações</span>
        {totalNotifications > 0 && <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{totalNotifications}</span>}
      </div>
      <div className="max-h-[320px] overflow-y-auto bg-gray-50 dark:bg-gray-900/50 custom-scrollbar">
        {totalNotifications === 0 ? (
          <div className="p-8 text-center flex flex-col items-center text-gray-400 gap-2">
            <Bell size={24} className="opacity-20" />
            <span className="text-sm">Tudo tranquilo por aqui.</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {pendingInvites.map(invite => {
              const leagueName = leagues.find(l => l.id === invite.leagueId)?.name || 'Liga desconhecida';
              return (
                <Link
                  key={invite.id}
                  to="/#invites-section"
                  onClick={() => {
                    setShowNotifications(false);
                    setIsMenuOpen(false);

                    // Force scroll if we are already on the home page
                    // (React Router might not re-trigger scroll if only hash changes sometimes)
                    if (window.location.pathname === '/') {
                      setTimeout(() => {
                        const element = document.getElementById('invites-section');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 300);
                    }
                  }}
                  className="block p-3 hover:bg-white dark:hover:bg-gray-800 transition-colors group relative"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400"></div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Mail size={14} className="text-yellow-600" /> Convite de Liga
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 pl-5">
                    Você foi convidado para entrar em: <span className="font-bold text-brasil-blue dark:text-blue-400">{leagueName}</span>
                  </p>
                </Link>
              );
            })}
            {adminLeaguesWithRequests.map(l => {
              const count = l.pendingRequests.filter(uid => users.some(u => u.id === uid)).length;
              return (
                <Link
                  key={l.id}
                  to={`/league/${l.id}?tab=admin`}
                  onClick={() => { setShowNotifications(false); setIsMenuOpen(false); }}
                  className="block p-3 hover:bg-white dark:hover:bg-gray-800 transition-colors group relative"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brasil-green"></div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Users size={14} className="text-green-600" /> Solicitações Pendentes
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 pl-5">
                    A liga <span className="font-bold text-brasil-blue dark:text-blue-400">{l.name}</span> possui <span className="font-bold">{count}</span> novo(s) pedido(s).
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col relative transition-colors duration-300">

      {/* OFFLINE / CONNECTION ERROR BANNER */}
      {connectionError && (
        <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-bold flex items-center justify-center gap-2 animate-pulse sticky top-0 z-[100] shadow-md">
          <WifiOff size={16} />
          Conexão perdida. Tentando reconectar...
          <button
            onClick={retryConnection}
            className="bg-white text-red-600 px-3 py-0.5 rounded-full text-xs ml-2 hover:bg-gray-100 transition-colors shadow-sm"
          >
            Tentar Agora
          </button>
        </div>
      )}

      {/* Global Toast Container */}
      <div className="fixed top-24 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {notifications.map((note) => (
          <div
            key={note.id}
            className="pointer-events-auto bg-white dark:bg-gray-800 border-l-4 shadow-xl rounded-r-lg p-4 animate-[slideIn_0.3s_ease-out] flex items-start gap-3 transform transition-all"
            style={{ borderColor: note.type === 'success' ? '#009c3b' : note.type === 'info' ? '#002776' : '#ffdf00' }}
          >
            <div className="mt-0.5">
              {note.type === 'success' && <div className="bg-green-100 dark:bg-green-900 p-1.5 rounded-full text-brasil-green dark:text-green-300"><Check size={16} /></div>}
              {note.type === 'info' && <div className="bg-blue-100 dark:bg-blue-900 p-1.5 rounded-full text-brasil-blue dark:text-blue-300"><Info size={16} /></div>}
              {note.type === 'warning' && <div className="bg-yellow-100 dark:bg-yellow-900 p-1.5 rounded-full text-yellow-700 dark:text-yellow-300"><Bell size={16} /></div>}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 dark:text-white text-sm">{note.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs mt-0.5">{note.message}</p>
            </div>
            <button onClick={() => removeNotification(note.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-gradient-to-r from-brasil-green to-brasil-blue text-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-brasil-yellow" />
            <span className="text-xl font-bold tracking-wide">Palpiteiro da Copa 2026</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex gap-4 items-center">
            <Link to="/" className={`px-3 py-2 rounded-md transition-colors ${isActive('/')}`}>Início</Link>
            <Link to="/table" className={`px-3 py-2 rounded-md transition-colors ${isActive('/table')}`}>Tabela</Link>
            <Link to="/simulador" className={`px-3 py-2 rounded-md transition-colors ${isActive('/simulador')}`}>Simulador</Link>
            <Link to="/leagues" className={`px-3 py-2 rounded-md transition-colors ${isActive('/leagues')}`}>Ligas</Link>
            <Link to="/como-jogar" className={`px-3 py-2 rounded-md transition-colors ${isActive('/como-jogar')}`}>Como Jogar</Link>

            {currentUser.isAdmin && (
              <Link to="/admin" className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1 ${isActive('/admin')}`}>
                <Settings size={16} />
                Admin
              </Link>
            )}

            <div className="flex items-center gap-3 ml-4 border-l border-white/20 pl-4">

              {/* Notification Bell with Dropdown */}
              <div className="relative" ref={notificationRef}>
                <button
                  className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell size={20} className="text-white" />
                  {totalNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-brasil-blue">
                      {totalNotifications}
                    </span>
                  )}
                </button>
                {showNotifications && renderNotificationDropdown()}
              </div>

              <Link to="/profile" className="flex items-center gap-2 hover:bg-white/10 p-1 pr-3 rounded-full transition-colors" title="Meu Perfil">
                <div className="relative">
                  <img src={currentUser.avatar} alt="User" className="w-8 h-8 rounded-full border-2 border-brasil-yellow object-cover" />
                </div>
                <span className="text-sm font-medium max-w-[100px] truncate">{currentUser.name}</span>
              </Link>
              <button onClick={logout} className="p-1 hover:text-red-300 transition-colors" title="Sair">
                <LogOut size={20} />
              </button>
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-4 lg:hidden">

            {/* Mobile Notification Bell */}
            <div className="relative">
              <button
                className="relative p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotifications(!showNotifications);
                }}
              >
                <Bell size={20} className="text-white" />
                {totalNotifications > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-brasil-blue">
                    {totalNotifications}
                  </span>
                )}
              </button>
              {showNotifications && renderNotificationDropdown()}
            </div>

            <button className="flex items-center" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <nav className="lg:hidden bg-brasil-blue border-t border-white/10 p-4 flex flex-col gap-2 shadow-inner">
            <Link onClick={() => setIsMenuOpen(false)} to="/" className={`block px-3 py-2 rounded-md ${isActive('/')}`}>
              <div className="flex justify-between items-center">
                Início
              </div>
            </Link>
            <Link onClick={() => setIsMenuOpen(false)} to="/table" className={`block px-3 py-2 rounded-md ${isActive('/table')}`}>Tabela</Link>
            <Link onClick={() => setIsMenuOpen(false)} to="/simulador" className={`block px-3 py-2 rounded-md ${isActive('/simulador')}`}>Simulador</Link>
            <Link onClick={() => setIsMenuOpen(false)} to="/leagues" className={`block px-3 py-2 rounded-md ${isActive('/leagues')}`}>Ligas</Link>
            <Link onClick={() => setIsMenuOpen(false)} to="/como-jogar" className={`block px-3 py-2 rounded-md ${isActive('/como-jogar')}`}>Como Jogar</Link>
            {currentUser.isAdmin && (
              <Link onClick={() => setIsMenuOpen(false)} to="/admin" className={`block px-3 py-2 rounded-md ${isActive('/admin')}`}>Admin Painel</Link>
            )}
            <div className="mt-4 pt-4 border-t border-white/10">
              <Link onClick={() => setIsMenuOpen(false)} to="/profile" className={`flex items-center gap-2 px-3 py-2 rounded-md mb-2 ${isActive('/profile')}`}>
                <User size={18} />
                Meu Perfil
              </Link>
              <div className="flex justify-between items-center px-3">
                <div className="flex items-center gap-2">
                  <img src={currentUser.avatar} alt="User" className="w-8 h-8 rounded-full object-cover" />
                  <span className="font-medium text-sm">{currentUser.name}</span>
                </div>
                <button onClick={() => { logout(); setIsMenuOpen(false); }} className="text-red-300 text-sm font-bold">Sair</button>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 dark:bg-black text-gray-400 py-6 text-center text-sm transition-colors duration-300">
        <p>© 2026 Bolão da Copa.</p>
      </footer>
    </div>
  );
};