"use client";

import React, { useState, useEffect } from 'react';
import { Mail, Users, FileText, Sparkles, Menu, X, User, Settings, Send, Bot, Lightbulb, Plus, Search, Home, MessageCircle } from 'lucide-react';

const FicheApp = () => {
  const [activeTab, setActiveTab] = useState('editor');
  const [userText, setUserText] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const mockSuggestions = [
    "Améliorer la structure de votre message",
    "Ajouter une introduction plus engageante",
    "Utiliser un ton plus professionnel",
    "Inclure des exemples concrets"
  ];

  useEffect(() => {
    if (userText.length > 10) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        setSuggestions(mockSuggestions);
        setIsTyping(false);
        setShowSuggestions(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [userText]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setShowLogin(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-200/20 to-indigo-200/20 blur-3xl"></div>
      <div className="absolute top-10 left-1/4 w-64 h-64 bg-blue-300/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-1/4 w-48 h-48 bg-indigo-300/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      {/* Mobile Header */}
      <header className="relative z-10 backdrop-blur-md bg-white/90 border-b border-blue-200/50 shadow-lg">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                FICHE
              </span>
            </div>

            {/* User Avatar */}
            <div className="flex items-center space-x-3">
              {isLoggedIn ? (
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              ) : (
                <button 
                  onClick={() => setShowLogin(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Connexion
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pb-20">
        {activeTab === 'editor' && (
          <div className="px-4 py-6 space-y-6">
            {/* Hero Card */}
            <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-6 text-center">
              <div className="inline-flex items-center space-x-2 bg-blue-100 rounded-full px-3 py-1 text-blue-700 text-xs font-medium mb-3">
                <Sparkles className="h-3 w-3" />
                <span>Assistant IA</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Transformez vos 
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {' '}idées
                </span>
              </h1>
              <p className="text-sm text-gray-600">
                Créez du contenu parfait avec l'aide de notre IA
              </p>
            </div>

            {/* Editor Card */}
            <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 overflow-hidden">
              <div className="p-4 border-b border-blue-200/30 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <FileText className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Vos Pensées</h3>
                </div>
              </div>
              <div className="p-4">
                <textarea
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  placeholder="Écrivez ce que vous voulez communiquer... Ne vous souciez pas de la grammaire - notez simplement vos idées."
                  className="w-full h-40 p-4 border-2 border-blue-200/50 rounded-xl focus:border-blue-500 focus:outline-none resize-none text-gray-700 placeholder-gray-400 bg-blue-50/30 backdrop-blur-sm transition-all duration-300 text-sm"
                />
                <div className="flex justify-between items-center mt-3">
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs transition-all duration-300 ${isTyping ? 'bg-blue-100 text-blue-600' : suggestions.length > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Bot className="h-3 w-3" />
                    <span>
                      {isTyping ? 'Analyse...' : suggestions.length > 0 ? 'Suggestions prêtes' : 'IA en attente'}
                    </span>
                  </div>
                  <button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2">
                    <Sparkles className="h-3 w-3" />
                    <span>Analyser</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Suggestions */}
            {showSuggestions && (
              <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-4 animate-in slide-in-from-bottom duration-500">
                <div className="flex items-center space-x-2 mb-4">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <h3 className="font-semibold text-gray-900 text-sm">Suggestions IA</h3>
                </div>
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50 active:bg-blue-100 transition-all duration-300"
                    >
                      <p className="text-xs text-gray-700">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Actions Rapides</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50 active:bg-blue-100 transition-all duration-300">
                  <Mail className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <span className="text-xs text-gray-700 block">E-mail</span>
                </button>
                <button className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200/50 active:bg-green-100 transition-all duration-300">
                  <FileText className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <span className="text-xs text-gray-700 block">Document</span>
                </button>
                <button className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200/50 active:bg-purple-100 transition-all duration-300">
                  <Users className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                  <span className="text-xs text-gray-700 block">Communauté</span>
                </button>
                <button className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200/50 active:bg-orange-100 transition-all duration-300">
                  <Send className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                  <span className="text-xs text-gray-700 block">Partager</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mail' && (
          <div className="px-4 py-6">
            <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Messages</h2>
              <p className="text-sm text-gray-600 mb-6">Envoyez et recevez des messages</p>
              {!isLoggedIn && (
                <button 
                  onClick={() => setShowLogin(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium"
                >
                  Se connecter
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="px-4 py-6">
            <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Communautés</h2>
              <p className="text-sm text-gray-600 mb-6">Rejoignez ou créez des communautés</p>
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Créer</span>
                </button>
                <button className="border-2 border-purple-200 text-purple-600 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center space-x-2">
                  <Search className="h-4 w-4" />
                  <span>Explorer</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 backdrop-blur-md bg-white/90 border-t border-blue-200/50 shadow-lg z-20">
        <div className="flex justify-around items-center py-2">
          <button 
            className={`flex flex-col items-center p-3 rounded-lg transition-all duration-300 ${activeTab === 'editor' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
            onClick={() => setActiveTab('editor')}
          >
            <Home className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Accueil</span>
          </button>
          <button 
            className={`flex flex-col items-center p-3 rounded-lg transition-all duration-300 ${activeTab === 'mail' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
            onClick={() => setActiveTab('mail')}
          >
            <MessageCircle className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Messages</span>
          </button>
          <button 
            className={`flex flex-col items-center p-3 rounded-lg transition-all duration-300 ${activeTab === 'community' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
            onClick={() => setActiveTab('community')}
          >
            <Users className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Communautés</span>
          </button>
          <button className="flex flex-col items-center p-3 rounded-lg text-gray-500">
            <Bot className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">IA</span>
          </button>
        </div>
      </nav>

      {/* Login Modal - Mobile Optimized */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="backdrop-blur-lg bg-white/95 rounded-t-3xl shadow-2xl border-t border-blue-200/50 w-full max-w-md p-6 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                <User className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Connexion</h2>
              <div className="space-y-4">
                <input 
                  type="email" 
                  placeholder="Email"
                  className="w-full p-4 border-2 border-blue-200/50 rounded-xl focus:border-blue-500 focus:outline-none bg-blue-50/30 backdrop-blur-sm text-sm"
                />
                <input 
                  type="password" 
                  placeholder="Mot de passe"
                  className="w-full p-4 border-2 border-blue-200/50 rounded-xl focus:border-blue-500 focus:outline-none bg-blue-50/30 backdrop-blur-sm text-sm"
                />
              </div>
              <div className="space-y-3">
                <button 
                  onClick={handleLogin}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-medium"
                >
                  Se connecter
                </button>
                <button 
                  onClick={() => setShowLogin(false)}
                  className="w-full border-2 border-gray-200 text-gray-600 py-4 rounded-xl font-medium"
                >
                  Annuler
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Pas de compte ? <span className="text-blue-600 font-medium">Créer un compte</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FicheApp;
