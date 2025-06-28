
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
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
  Share2,
  Volume2,
  Pause,
  Copy,
  ThumbsUp,
  RotateCw,
  Check,
  Edit,
  Info
} from 'lucide-react';
import { analyzeText } from '@/ai/flows/analyze-text';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { generateCommunityDescription } from '@/ai/flows/generate-community-description';
import { generateCommunityImage } from '@/ai/flows/generate-community-image';
import { summarizeDocument } from '@/ai/flows/summarize-document';
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { auth, db, storage } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { doc, setDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  id: string;
  name: string;
  members: string[];
  description: string;
  imageUrl: string;
  creatorId: string;
  dataAiHint: string;
  subscribed: boolean;
};

type FileInfo = {
  id: string;
  name: string;
  size: number;
  date: { toDate: () => Date };
  author: string;
  url: string;
  creatorId: string;
  summary: string;
  type: string;
};

type ActiveTab = 'chat' | 'communities' | 'files' | 'messages' | 'settings';

const AuthForm = () => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le nom est requis.' });
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: name,
        email: email,
        createdAt: new Date(),
      });

      toast({ title: 'Compte créé', description: 'Vous êtes maintenant connecté.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erreur d'inscription", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Connexion réussie', description: 'Bienvenue !' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur de connexion', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold font-headline text-primary">FICHE</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">Votre assistant IA intelligent</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-lg bg-gray-200 dark:bg-gray-700 p-1">
              <button
                onClick={() => setAuthMode('login')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${authMode === 'login' ? 'bg-white dark:bg-gray-900 text-primary shadow' : 'text-gray-600 dark:text-gray-300'}`}
              >
                Connexion
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${authMode === 'register' ? 'bg-white dark:bg-gray-900 text-primary shadow' : 'text-gray-600 dark:text-gray-300'}`}
              >
                Inscription
              </button>
            </div>
          </div>

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-6">
            {authMode === 'register' && (
              <div>
                <Input
                  type="text"
                  placeholder="Nom complet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700"
                  required
                />
              </div>
            )}
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-50 dark:bg-gray-700"
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-50 dark:bg-gray-700"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Chargement...' : (authMode === 'login' ? 'Se connecter' : 'Créer un compte')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

type ChatMessageItemProps = {
  message: ChatMessage;
  isPlaying: boolean;
  onPlayAudio: () => void;
  onCopy: (text: string) => void;
  onLike: () => void;
};

const ChatMessageDisplay = React.memo(
  ({
    message,
    isPlaying,
    onPlayAudio,
    onCopy,
    onLike,
  }: ChatMessageItemProps) => {
    return (
      <div className={`flex items-start gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
         {message.type === 'ai' && <Avatar className="w-8 h-8"><AvatarFallback><Brain size={18}/></AvatarFallback></Avatar> }
        <div className={`w-full max-w-2xl rounded-xl p-4 ${message.type === 'user' ? 'bg-primary/10' : 'bg-background dark:bg-gray-800'}`}>
          {message.type === 'user' ? (
              <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-none">
                      <AccordionTrigger className="font-semibold text-primary p-0 hover:no-underline">
                          Votre texte soumis
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                          <p className="text-foreground/90">{message.content}</p>
                      </AccordionContent>
                  </AccordionItem>
              </Accordion>
          ) : (
            <div className="space-y-4">
                <p className="text-foreground/90">{message.content}</p>
                <Accordion type="single" collapsible className="w-full">
                  {message.suggestions && message.suggestions.length > 0 && (
                    <AccordionItem value="suggestions">
                      <AccordionTrigger className="text-sm font-semibold">
                        <Sparkles className="w-4 h-4 mr-2"/>
                        Suggestions
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-1">
                          {message.suggestions.map((suggestion, i) => (
                            <li key={i}>{suggestion}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {message.ideas && message.ideas.length > 0 && (
                    <AccordionItem value="ideas">
                      <AccordionTrigger className="text-sm font-semibold">
                          💡 Idées créatives
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-1">
                          {message.ideas.map((idea, i) => (
                            <li key={i}>{idea}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {message.actions && message.actions.length > 0 && (
                    <AccordionItem value="actions">
                      <AccordionTrigger className="text-sm font-semibold">
                          🎯 Actions possibles
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-1">
                          {message.actions.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              <div className="flex items-center gap-2 mt-2">
                {message.audioDataUri && (
                  <Button variant="ghost" size="icon" onClick={onPlayAudio} className="h-8 w-8">
                      {isPlaying ? <Pause size={16}/> : <Volume2 size={16}/>}
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => onCopy(message.content)} className="h-8 w-8"> <Copy size={16}/> </Button>
                <Button variant="ghost" size="icon" onClick={onLike} className={`h-8 w-8 ${message.liked ? 'text-red-500' : ''}`}>
                   <ThumbsUp size={16}/>
                </Button>
              </div>
            </div>
          )}
        </div>
           {message.type === 'user' && <Avatar className="w-8 h-8"><AvatarFallback><User size={18}/></AvatarFallback></Avatar> }
      </div>
    );
  }
);
ChatMessageDisplay.displayName = 'ChatMessageDisplay';


const FicheApp = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [userText, setUserText] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingSummary, setViewingSummary] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const audioPlayer = useRef<HTMLAudioElement | null>(null);
  const [audioStatus, setAudioStatus] = useState<{ playingIndex: number }>({ playingIndex: -1 });

  useEffect(() => {
    if (!currentUser) {
      setCommunities([]);
      return;
    }

    const q = query(collection(db, "communities"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const communitiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        subscribed: doc.data().members?.includes(currentUser.uid)
      })) as Community[];
      setCommunities(communitiesData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setFiles([]);
      return;
    }

    const q = query(collection(db, "files"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const filesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FileInfo[];
      setFiles(filesData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        audioPlayer.current = new Audio();
        const player = audioPlayer.current;

        const onEnded = () => setAudioStatus({ playingIndex: -1 });

        player.addEventListener('ended', onEnded);
        player.addEventListener('pause', onEnded);

        return () => {
            player.removeEventListener('ended', onEnded);
            player.removeEventListener('pause', onEnded);
            player.pause();
        };
    }
  }, []);

  const handlePlayAudio = useCallback((index: number, audioDataUri: string) => {
      const player = audioPlayer.current;
      if (!player) return;

      if (audioStatus.playingIndex === index) {
          player.pause();
          setAudioStatus({ playingIndex: -1 });
      } else {
          player.src = audioDataUri;
          player.play().catch(e => {
            if (e.name !== 'AbortError') {
              console.error("Error playing audio:", e)
              toast({ variant: 'destructive', title: "Erreur audio", description: "Impossible de lire le fichier audio."})
            }
          });
          setAudioStatus({ playingIndex: index });
      }
  }, [audioStatus.playingIndex, toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user as FirebaseUser | null);
      setIsAuthenticating(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Déconnexion', description: 'Vous avez été déconnecté.' });
    } catch (error: any) {
      toast({ variant: "destructive", title: 'Erreur', description: error.message });
    }
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
  
  const handleNewChat = () => {
    setChatHistory([]);
    toast({ title: 'Nouvelle discussion', description: 'La conversation a été réinitialisée.' });
  };

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copié',
        description: 'Le texte a été copié dans le presse-papiers.',
      });
    });
  }, [toast]);

  const handleLike = useCallback((index: number) => {
    setChatHistory(prev =>
      prev.map((message, i) => {
        if (i === index && message.type === 'ai') {
          return { ...message, liked: !message.liked };
        }
        return message;
      })
    );
  }, []);

  const handleSubscribe = async (communityId: string) => {
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Vous devez être connecté pour vous abonner.' });
      return;
    }

    const communityRef = doc(db, 'communities', communityId);
    const community = communities.find(c => c.id === communityId);
    if (!community) return;

    try {
      if (community.subscribed) {
        // Unsubscribe
        await updateDoc(communityRef, {
          members: arrayRemove(currentUser.uid)
        });
        toast({ title: 'Désabonnement', description: `Vous n'êtes plus abonné à la communauté "${community.name}".` });
      } else {
        // Subscribe
        await updateDoc(communityRef, {
          members: arrayUnion(currentUser.uid)
        });
        toast({ title: 'Abonnement réussi', description: `Vous êtes maintenant abonné à la communauté "${community.name}".` });
      }
    } catch (error) {
      console.error('Failed to (un)subscribe:', error);
      toast({ variant: 'destructive', title: 'Erreur', description: "L'opération a échoué. Veuillez réessayer." });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !currentUser) return;

    const file = event.target.files[0];
    setIsUploading(true);
    toast({ title: 'Importation en cours...', description: `Le fichier "${file.name}" est en cours de traitement.` });

    try {
        const reader = new FileReader();
        const dataUriPromise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
        const documentDataUri = await dataUriPromise;

        let summary = "Le résumé n'est pas disponible pour ce type de fichier.";
        if (file.type.startsWith('application/pdf') || file.type.startsWith('text/')) {
             try {
                const summaryResult = await summarizeDocument({ documentDataUri });
                summary = summaryResult.summary;
             } catch (aiError) {
                console.error("AI summarization failed:", aiError);
                summary = "La génération du résumé par l'IA a échoué.";
             }
        }

        const fileStorageRef = storageRef(storage, `files/${currentUser.uid}/${Date.now()}-${file.name}`);
        await uploadBytes(fileStorageRef, file);
        const downloadURL = await getDownloadURL(fileStorageRef);

        await addDoc(collection(db, 'files'), {
            name: file.name,
            size: file.size,
            type: file.type,
            url: downloadURL,
            summary: summary,
            author: currentUser.displayName || 'Utilisateur inconnu',
            creatorId: currentUser.uid,
            createdAt: serverTimestamp(),
        });
        
        toast({ title: 'Fichier importé', description: `"${file.name}" a été importé et analysé avec succès.` });

    } catch (error) {
        console.error("File upload failed:", error);
        toast({ variant: "destructive", title: "Erreur d'importation", description: "Une erreur est survenue." });
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };

  function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  const ChatInterface = () => (
    <div className="flex flex-col h-full bg-muted/40 dark:bg-gray-800/20">
      <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto">
        {chatHistory.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <div className="p-5 bg-background dark:bg-gray-800 rounded-full mb-4">
                <Brain size={40} className="text-primary"/>
              </div>
              <h2 className="text-2xl font-semibold text-foreground">Commencez une conversation</h2>
              <p>Tapez votre texte et recevez des suggestions intelligentes.</p>
          </div>
        ) : (
          chatHistory.map((message, index) => (
            <div key={index}>
              <ChatMessageDisplay
                message={message}
                isPlaying={audioStatus.playingIndex === index}
                onPlayAudio={() => {
                  if (message.audioDataUri) {
                      handlePlayAudio(index, message.audioDataUri);
                  }
                }}
                onCopy={() => handleCopy(message.content)}
                onLike={() => handleLike(index)}
              />
            </div>
          ))
        )}
        {isLoading && (
           <div className="flex items-center gap-4 justify-start">
              <Avatar className="w-8 h-8"><AvatarFallback><Brain size={18}/></AvatarFallback></Avatar>
                <div className="bg-background dark:bg-gray-800 p-4 rounded-xl">
                 L'IA réfléchit...
              </div>
            </div>
          
        )}
      </div>
      <div className="p-4 bg-background dark:bg-gray-900/50 border-t border-border">
        <div className="relative flex items-center gap-2">
          <div className="flex-1">
            <Textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="Tapez votre texte ici pour recevoir des suggestions..."
              className="pr-12 bg-muted dark:bg-gray-800"
              rows={2}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                }
              }}
            />
          </div>
          <Button variant="ghost" size="icon" onClick={handleNewChat} className="h-10 w-10">
            <RotateCw size={18} />
          </Button>
          <Button onClick={handleTextSubmit} disabled={isLoading || !userText.trim()} className="h-10 w-10" size="icon">
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );

  const CommunitiesTab = () => {
    const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const myCommunities = communities.filter(
        (community) => community.creatorId === currentUser?.uid
    );
    const otherCommunities = communities.filter(
        (community) => community.creatorId !== currentUser?.uid
    );

    const filteredOtherCommunities = otherCommunities.filter(community =>
      community.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="h-full flex flex-col p-6 bg-muted/40 dark:bg-gray-800/20 overflow-y-auto">
        <header className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Communautés</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64 bg-background"
                />
            </div>
            <Button onClick={() => setIsCreateCommunityOpen(true)}>
                <Plus size={16} className="mr-2"/>
                Créer
            </Button>
          </div>
        </header>

        {myCommunities.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Mes communautés</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {myCommunities.map(community => (
                <div key={community.id} className="text-center group">
                  <div className="relative w-28 h-28 mx-auto mb-2">
                    <Image
                      src={community.imageUrl || `https://placehold.co/112x112.png`}
                      alt={community.name}
                      width={112}
                      height={112}
                      className="rounded-full object-cover border-4 border-background dark:border-gray-800"
                      data-ai-hint={community.name}
                    />
                     <Button variant="outline" size="icon" className="absolute bottom-0 right-0 h-8 w-8 rounded-full">
                      <Edit size={14} />
                    </Button>
                  </div>
                  <p className="font-semibold">{community.name}</p>
                  <p className="text-sm text-muted-foreground">{community.members?.length || 0} membres</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <h3 className="text-lg font-semibold mb-4">Découvrir</h3>
        {filteredOtherCommunities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredOtherCommunities.map(community => (
              <div key={community.id} className="text-center group">
                <div className="relative w-28 h-28 mx-auto mb-2">
                   <Image
                      src={community.imageUrl || `https://placehold.co/112x112.png`}
                      alt={community.name}
                      width={112}
                      height={112}
                      className="rounded-full object-cover border-4 border-background dark:border-gray-800"
                      data-ai-hint={community.name}
                    />
                     <Button
                       onClick={() => handleSubscribe(community.id)}
                       variant={community.subscribed ? 'default' : 'outline'}
                       size="icon"
                       className="absolute bottom-0 right-0 h-8 w-8 rounded-full">
                      {community.subscribed ? <Check size={14}/> : <Plus size={14}/>}
                    </Button>
                  </div>
                  <p className="font-semibold">{community.name}</p>
                  <p className="text-sm text-muted-foreground">{community.members?.length || 0} membres</p>
                </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-10">
            <div className="inline-block p-4 bg-background rounded-full">
              <Users size={32} />
            </div>
             <h3 className="mt-4 text-lg font-semibold">Aucune communauté à découvrir</h3>
             <p className="text-sm">Revenez plus tard ou créez la vôtre !</p>
          </div>
        )}
         <CreateCommunityDialog isOpen={isCreateCommunityOpen} onOpenChange={setIsCreateCommunityOpen} currentUser={currentUser} />
      </div>
    );
  };
  
  const CreateCommunityDialog = ({ isOpen, onOpenChange, currentUser }: { isOpen: boolean, onOpenChange: (open: boolean) => void, currentUser: FirebaseUser | null }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const { toast } = useToast();

    const handleGenerateDescription = async () => {
      if (!name.trim()) {
        toast({ variant: "destructive", title: "Erreur", description: "Veuillez d'abord donner un nom à votre communauté." });
        return;
      }
      setIsGenerating(true);
      try {
        const result = await generateCommunityDescription({ prompt: name });
        setDescription(result.description);
      } catch (error) {
        console.error("Error generating description:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de générer la description." });
      } finally {
        setIsGenerating(false);
      }
    };
    
    const handleCreate = async () => {
        if (!name.trim() || !description.trim() || !currentUser) {
            toast({ variant: "destructive", title: "Erreur", description: "Le nom et la description sont requis." });
            return;
        }

        setIsCreating(true);
        try {
            const imageResult = await generateCommunityImage({ prompt: name });
            const imageDataUri = imageResult.imageUrl;

            const imageRef = storageRef(storage, `communities/${currentUser.uid}/${name.replace(/\s/g, '_')}-${Date.now()}.png`);
            await uploadString(imageRef, imageDataUri, 'data_url');
            const downloadURL = await getDownloadURL(imageRef);

            await addDoc(collection(db, 'communities'), {
                name,
                description,
                imageUrl: downloadURL,
                creatorId: currentUser.uid,
                members: [currentUser.uid],
                createdAt: serverTimestamp(),
            });
            
            toast({ title: "Communauté créée", description: `La communauté "${name}" a été créée avec succès.` });
            onOpenChange(false);
            setName('');
            setDescription('');

        } catch (error) {
            console.error("Error creating community:", error);
            toast({ variant: "destructive", title: "Erreur", description: "La création de la communauté a échoué." });
        } finally {
            setIsCreating(false);
        }
    };

    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une nouvelle communauté</DialogTitle>
            <DialogDescription>
                Donnez un nom à votre communauté et décrivez-la pour attirer des membres.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                  <label htmlFor="name">Nom</label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                  <label htmlFor="description">Description</label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                  <div className="flex justify-end">
                      <Button onClick={handleGenerateDescription} variant="ghost" size="sm" disabled={isGenerating}>
                          <Sparkles className="w-4 h-4 mr-2"/>
                          {isGenerating ? 'Génération...' : 'Générer avec l\'IA'}
                      </Button>
                  </div>
              </div>
          </div>
          <DialogFooter>
              <Button onClick={handleCreate} disabled={isCreating || !name.trim() || !description.trim()}>
                  {isCreating ? 'Création en cours...' : 'Créer la communauté'}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const FilesTab = () => (
    <div className="h-full flex flex-col p-6 bg-muted/40 dark:bg-gray-800/20">
      <header className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Fichiers</h2>
        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          <Upload size={16} className="mr-2" />
          {isUploading ? 'Importation...' : 'Importer'}
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt"
        />
      </header>
      {files.length === 0 && !isUploading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="inline-block p-4 bg-background rounded-full">
              <FileText size={32} />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Aucun fichier</h3>
            <p className="text-sm">Importez votre premier document pour commencer.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto">
          {files.map(file => (
            <div key={file.id} className="bg-background dark:bg-gray-800 rounded-lg p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <FileText className="text-primary" />
                </div>
                <div className="truncate">
                  <p className="font-semibold truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {formatBytes(file.size)} • {file.date?.toDate().toLocaleDateString('fr-FR')} • {file.author}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon"><Download size={18} /></Button>
                </a>
                <Button variant="ghost" size="icon" onClick={() => {
                  navigator.clipboard.writeText(file.url);
                  toast({ title: 'Lien copié !' });
                }}>
                  <Share2 size={18} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setViewingSummary(file.summary)}>
                  <Info size={18} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
       <Dialog open={!!viewingSummary} onOpenChange={(open) => !open && setViewingSummary(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résumé du document</DialogTitle>
            <DialogDescription>
              Voici un résumé du document généré par l'IA.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-96 overflow-y-auto">
            <p className="text-sm">{viewingSummary}</p>
          </div>
           <DialogFooter>
              <Button onClick={() => setViewingSummary(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  const MessagesTab = () => (
    <div className="h-full flex flex-col p-6 bg-muted/40 dark:bg-gray-800/20">
      <header className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Messages</h2>
        <Button>
            <Plus size={16} className="mr-2"/>
            Nouveau
        </Button>
      </header>
      <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
              <div className="inline-block p-4 bg-background rounded-full">
                 <Mail size={32} />
              </div>
               <h3 className="mt-4 text-lg font-semibold">Aucun message</h3>
               <p className="text-sm">Commencez une conversation avec un membre de la communauté</p>
          </div>
      </div>
    </div>
  );

  const SettingsTab = () => (
    <div className="h-full p-6 bg-muted/40 dark:bg-gray-800/20 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Paramètres</h2>
        <div className="space-y-8 max-w-2xl mx-auto">
            <div className="bg-background dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Profil</h3>
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <Avatar className="w-24 h-24">
                           <AvatarFallback><User size={40}/></AvatarFallback>
                        </Avatar>
                        <Button size="icon" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full">
                           <Edit size={14}/>
                           <span className="sr-only">Changer la photo</span>
                        </Button>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="text-sm font-medium">Nom complet</label>
                            <Input defaultValue={currentUser?.displayName || ''} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Adresse e-mail</label>
                            <Input defaultValue={currentUser?.email || ''} readOnly />
                        </div>
                    </div>
                    <div>
                      <Button>Mettre à jour le profil</Button>
                    </div>
                </div>
            </div>

            <div className="bg-background dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Apparence</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Thème sombre</p>
                        <p className="text-sm text-muted-foreground">Activez le mode sombre pour une expérience visuelle différente.</p>
                    </div>
                    <Switch
                        checked={theme === 'dark'}
                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                        aria-label="Activer le thème sombre"
                    />
                </div>
            </div>

            <div className="bg-background dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Notifications</h3>
                <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Notifications par e-mail</p>
                            <p className="text-sm text-muted-foreground">Recevoir des notifications importantes par e-mail.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Notifications push</p>
                            <p className="text-sm text-muted-foreground">Recevoir des notifications push sur vos appareils.</p>
                        </div>
                        <Switch />
                    </div>
                </div>
            </div>

            <div className="bg-background dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Compte</h3>
                 <div className="space-y-4">
                    <Button variant="outline">
                        Changer le mot de passe
                    </Button>
                     <Button variant="destructive">
                        Supprimer le compte
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );

  if (isAuthenticating) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
            <h1 className="text-5xl font-bold font-headline text-primary">FICHE</h1>
            <p className="mt-2 text-lg text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthForm />;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-64 flex flex-col bg-white dark:bg-gray-900 border-r border-border p-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain size={24} className="text-primary"/>
          </div>
          <h1 className="text-2xl font-bold font-headline text-primary">FICHE</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <Button variant={activeTab === 'chat' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('chat')}>
            <MessageCircle size={18} className="mr-3"/>
            Chat IA
          </Button>
          <Button variant={activeTab === 'communities' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('communities')}>
            <Users size={18} className="mr-3"/>
            Communautés
          </Button>
          <Button variant={activeTab === 'files' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('files')}>
            <FileText size={18} className="mr-3"/>
            Fichiers
          </Button>
          <Button variant={activeTab === 'messages' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('messages')}>
            <Mail size={18} className="mr-3"/>
            Messages
          </Button>
          <Button variant={activeTab === 'settings' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('settings')}>
            <Settings size={18} className="mr-3"/>
            Paramètres
          </Button>
        </nav>
        <div className="mt-auto">
          <Separator className="my-4"/>
          <div className="flex items-center gap-3">
             <Avatar>
              <AvatarFallback>{currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="font-semibold truncate">{currentUser?.displayName || 'Utilisateur'}</p>
              <p className="text-sm text-muted-foreground truncate">{currentUser?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="flex-shrink-0">
                <LogOut size={18}/>
                <span className="sr-only">Déconnexion</span>
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'communities' && <CommunitiesTab />}
        {activeTab === 'files' && <FilesTab />}
        {activeTab === 'messages' && <MessagesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
};

export default FicheApp;
