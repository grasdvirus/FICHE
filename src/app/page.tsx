"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Users, 
  Mail, 
  FileText, 
  Settings, 
  Send, 
  Plus, 
  Search,
  User,
  LogOut,
  Sparkles,
  Brain,
  Upload,
  Download,
  Eye,
  Heart,
  Share2,
  Filter,
  Volume2,
  Pause,
  Copy,
  ThumbsUp
} from 'lucide-react';
import { analyzeText } from '@/ai/flows/analyze-text';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { useToast } from "@/hooks/use-toast";

type UserProfile = {
  name: string;
  email: string;
};

type ChatMessage = {
  type: 'user' | 'ai';
  content: string;
  suggestions?: string[];
  ideas?: string[];
  actions?: string[];
  timestamp: Date;
  audioDataUri?: string;
  liked?: boolean;
};

type Community = {
  id: number;
  name: string;
  members: number;
  description: string;
};

type FileInfo = {
  id: number;
  name: string;
  size: string;
  date: string;
  author: string;
};

type ActiveTab = 'chat' | 'communities' | 'files' | 'messages';

const FicheApp = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [userText, setUserText] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([
    { id: 1, name: 'Développeurs', members: 234, description: 'Communauté de développeurs passionnés' },
    { id: 2, name: 'Designers', members: 156, description: 'Partage de créations et conseils design' },
    { id: 3, name: 'Étudiants', members: 89, description: 'Entraide et ressources académiques' }
  ]);
  const [files, setFiles] = useState<FileInfo[]>([
    { id: 1, name: 'Guide React.pdf', size: '2.4 MB', date: '2025-06-25', author: 'Marie Dubois' },
    { id: 2, name: 'Présentation IA.pptx', size: '5.1 MB', date: '2025-06-24', author: 'Jean Martin' }
  ]);
  const [activeAudioIndex, setActiveAudioIndex] = useState<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<Map<number, HTMLAudioElement | null>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleAuth = () => {
    setCurrentUser({ name: 'Utilisateur', email: 'user@example.com' });
    setShowAuth(false);
  };

  const handleTextSubmit = async () => {
    if (!userText.trim()) return;
    
    setIsLoading(true);
    const currentText = userText;
    const userMessage: ChatMessage = { type: 'user', content: currentText, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);
    setUserText('');

    try {
      const aiData = await analyzeText({ text: currentText });
      const audioResult = await textToSpeech({ text: aiData.explanation });
      
      const aiMessage: ChatMessage = {
        type: 'ai',
        content: aiData.explanation,
        suggestions: aiData.suggestions,
        ideas: aiData.ideas,
        actions: aiData.actions,
        timestamp: new Date(),
        audioDataUri: audioResult.media,
        liked: false,
      };
      
      setChatHistory(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Erreur IA:', error);
      const errorMessage: ChatMessage = {
        type: 'ai',
        content: 'Désolé, je rencontre des difficultés techniques. Veuillez réessayer.',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    }
    
    setIsLoading(false);
  };

  const handlePlayAudio = (index: number) => {
    const audioEl = audioRefs.current.get(index);
    if (!audioEl) return;

    if (activeAudioIndex !== null && activeAudioIndex !== index) {
      const currentAudioEl = audioRefs.current.get(activeAudioIndex);
      if (currentAudioEl) {
        currentAudioEl.pause();
        currentAudioEl.currentTime = 0;
      }
    }

    if (audioEl.paused) {
      audioEl.play().catch(e => console.error("Error playing audio:", e));
      setActiveAudioIndex(index);
    } else {
      audioEl.pause();
      setActiveAudioIndex(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copié',
        description: 'Le texte a été copié dans le presse-papiers.',
      });
    });
  };

  const handleLike = (index: number) => {
    setChatHistory(prev => {
      return prev.map((msg, i) => {
        if (i === index) {
          return { ...msg, liked: !msg.liked };
        }
        return msg;
      });
    });
  };

  const AuthForm = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full mb-4 shadow-lg">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-headline font-bold text-gray-800 mb-2">FICHE</h1>
          <p className="text-gray-600">Votre assistant IA intelligent</p>
        </div>
        
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              authMode === 'login' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              authMode === 'register' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Inscription
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Mot de passe"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
          {authMode === 'register' && (
            <div>
              <input
                type="text"
                placeholder="Nom complet"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
          )}
          <button
            onClick={handleAuth}
            className="w-full bg-gradient-to-r from-primary to-accent text-white py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {authMode === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        </div>
      </div>
    </div>
  );

  const ChatInterface = () => (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {chatHistory.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center h-full">
            <Brain className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-headline font-semibold text-gray-800 mb-2">Commencez une conversation</h3>
            <p className="text-gray-600">Tapez votre texte et recevez des suggestions intelligentes.</p>
          </div>
        ) : (
          chatHistory.map((message, index) => (
            <div key={`${message.timestamp.toISOString()}-${index}`} className={`flex items-end gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
               {message.type === 'ai' && <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Brain className="w-5 h-5 text-primary"/></div>}
              <div className={`max-w-2xl p-4 rounded-2xl shadow-sm ${
                message.type === 'user' 
                  ? 'bg-gradient-to-r from-primary to-accent text-white rounded-br-none' 
                  : 'bg-white border border-gray-200 text-foreground rounded-bl-none'
              }`}>
                <p className="mb-2 whitespace-pre-wrap">{message.content}</p>
                {message.type === 'ai' && (
                  <>
                    <div className="mt-4 space-y-3">
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-primary mb-2 flex items-center">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Suggestions
                          </h4>
                          <div className="space-y-2">
                            {message.suggestions.map((suggestion, i) => (
                              <div key={i} className="bg-primary/10 p-3 rounded-lg text-sm text-primary-foreground">
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {message.ideas && message.ideas.length > 0 && (
                        <div className="pt-2">
                          <h4 className="font-semibold text-accent mb-2 flex items-center">💡 Idées créatives</h4>
                          <div className="space-y-2">
                            {message.ideas.map((idea, i) => (
                              <div key={i} className="bg-accent/10 p-3 rounded-lg text-sm text-accent-foreground">
                                {idea}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {message.actions && message.actions.length > 0 && (
                        <div className="pt-2">
                          <h4 className="font-semibold text-secondary-foreground mb-2 flex items-center">🎯 Actions possibles</h4>
                          <div className="space-y-2">
                            {message.actions.map((action, i) => (
                              <div key={i} className="bg-secondary p-3 rounded-lg text-sm text-secondary-foreground">
                                {action}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200/50 flex items-center space-x-1">
                      {message.audioDataUri && (
                        <>
                          <audio
                            ref={(el) => audioRefs.current.set(index, el)}
                            src={message.audioDataUri}
                            preload="none"
                            onEnded={() => setActiveAudioIndex(null)}
                          />
                          <button
                            onClick={() => handlePlayAudio(index)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label={activeAudioIndex === index ? "Mettre en pause" : "Lire l'audio"}
                          >
                            {activeAudioIndex === index ? <Pause className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleCopy(message.content)}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Copier le texte"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleLike(index)}
                        className={`p-2 rounded-full transition-colors ${
                          message.liked
                            ? 'text-primary hover:bg-primary/10'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                        aria-label="Aimer"
                      >
                        <ThumbsUp className={`w-5 h-5 ${message.liked ? 'fill-primary' : ''}`} />
                      </button>
                    </div>
                  </>
                )}
              </div>
                {message.type === 'user' && <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0"><User className="w-5 h-5 text-white"/></div>}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Brain className="w-5 h-5 text-primary"/></div>
            <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-bl-none shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                <span className="text-gray-600">L'IA réfléchit...</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="Tapez votre texte ici pour recevoir des suggestions..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none bg-gray-50"
              rows={2}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                }
              }}
            />
          </div>
          <button
            onClick={handleTextSubmit}
            disabled={!userText.trim() || isLoading}
            className="bg-gradient-to-r from-primary to-accent text-white p-3 rounded-lg hover:opacity-90 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const CommunitiesTab = () => (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-headline font-bold text-gray-800">Communautés</h2>
        <button className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all duration-200 flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Créer</span>
        </button>
      </div>
      
      <div className="grid gap-4">
        {communities.map(community => (
          <div key={community.id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-headline font-semibold text-gray-800">{community.name}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{community.members} membres</span>
              </div>
            </div>
            <p className="text-gray-600 mb-4">{community.description}</p>
            <div className="flex space-x-3">
              <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-80 transition-colors">
                Rejoindre
              </button>
              <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Voir plus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const FilesTab = () => (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-headline font-bold text-gray-800">Fichiers</h2>
        <button className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all duration-200 flex items-center space-x-2">
          <Upload className="w-4 h-4" />
          <span>Importer</span>
        </button>
      </div>
      
      <div className="grid gap-4">
        {files.map(file => (
          <div key={file.id} className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold font-headline text-gray-800">{file.name}</h3>
                  <p className="text-sm text-gray-600">{file.size} • {file.date} • {file.author}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Eye className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const MessagesTab = () => (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-headline font-bold text-gray-800">Messages</h2>
        <button className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all duration-200 flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Nouveau</span>
        </button>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="text-center py-12">
          <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucun message</h3>
          <p className="text-gray-500">Commencez une conversation avec un membre de la communauté</p>
        </div>
      </div>
    </div>
  );

  if (showAuth) {
    return <AuthForm />;
  }

  return (
    <div className="h-screen bg-background flex">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-headline text-gray-800">FICHE</h1>
          </div>
        </div>
        
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            {[
              { id: 'chat', label: 'Chat IA', icon: MessageCircle },
              { id: 'communities', label: 'Communautés', icon: Users },
              { id: 'files', label: 'Fichiers', icon: FileText },
              { id: 'messages', label: 'Messages', icon: Mail },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
                  activeTab === item.id 
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800">{currentUser?.name}</p>
              <p className="text-sm text-gray-600">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setCurrentUser(null);
              setShowAuth(true);
            }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'communities' && <CommunitiesTab />}
        {activeTab === 'files' && <FilesTab />}
        {activeTab === 'messages' && <MessagesTab />}
      </main>
    </div>
  );
};

export default FicheApp;
