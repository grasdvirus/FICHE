
"use client";

import React, { useState, useEffect } from 'react';
import { Mail, Users, FileText, Sparkles, Send, Bot, Lightbulb, Plus, Search, Home, MessageCircle, User } from 'lucide-react';
import { analyzeText, type AnalyzeTextOutput } from '@/ai/flows/analyze-text';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, type User as FirebaseUser, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';


const FicheApp = () => {
  const [activeTab, setActiveTab] = useState('editor');
  const [userText, setUserText] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  
  // States for AI analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeTextOutput | null>(null);
  
  // Auth states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setShowLogin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuthError = (error: any) => {
    console.error("Erreur d'authentification:", error.code);
    let title = "Erreur d'authentification";
    let description = "Une erreur inconnue est survenue. Veuillez réessayer.";

    switch (error.code) {
        case 'auth/invalid-email':
            description = "L'adresse e-mail n'est pas valide.";
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            description = "L'adresse e-mail ou le mot de passe est incorrect.";
            break;
        case 'auth/email-already-in-use':
            description = "Cette adresse e-mail est déjà utilisée par un autre compte.";
            break;
        case 'auth/weak-password':
            description = "Le mot de passe doit contenir au moins 6 caractères.";
            break;
        case 'auth/popup-closed-by-user':
            description = "La fenêtre de connexion a été fermée avant la fin de l'opération.";
            break;
        default:
            break;
    }
    toast({ title, description, variant: 'destructive' });
  };

  const handleEmailSignUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: 'Compte créé', description: 'Votre compte a été créé avec succès.' });
    } catch (error) {
      handleAuthError(error);
    }
  };
  
  const handleEmailSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Connexion réussie', description: 'Vous êtes maintenant connecté.' });
    } catch (error) {
      handleAuthError(error);
    }
  };
  
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast({ title: 'Connexion réussie', description: 'Vous êtes maintenant connecté avec Google.' });
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    toast({ title: 'Déconnexion', description: 'Vous avez été déconnecté.' });
  };


  const handleAnalyze = async () => {
    if (!userText.trim()) {
        toast({
            title: 'Le champ de texte est vide',
            description: 'Veuillez écrire quelque chose à analyser.',
            variant: 'destructive',
        });
        return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null); // Clear previous results
    try {
        const result = await analyzeText({ text: userText });
        setAnalysisResult(result);
    } catch (error) {
        console.error("Erreur lors de l'analyse du texte:", error);
        toast({
            title: "Erreur d'analyse",
            description: "Une erreur s'est produite lors de l'analyse de votre texte. Veuillez réessayer.",
            variant: 'destructive',
        });
    } finally {
        setIsAnalyzing(false);
    }
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
              {user ? (
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                    </div>
                    <button onClick={handleSignOut} className="text-sm text-gray-600 hover:text-blue-600 hidden sm:block">
                        Déconnexion
                    </button>
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
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs transition-all duration-300 ${isAnalyzing ? 'bg-blue-100 text-blue-600' : analysisResult ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Bot className="h-3 w-3" />
                    <span>
                      {isAnalyzing ? 'Analyse en cours...' : analysisResult ? 'Analyse terminée' : 'IA en attente'}
                    </span>
                  </div>
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                        <>
                            <Bot className="h-3 w-3 animate-spin" />
                            <span>Analyse...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-3 w-3" />
                            <span>Analyser</span>
                        </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* AI Results */}
            {analysisResult && (
              <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-4 animate-in slide-in-from-bottom duration-500 space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <h3 className="font-semibold text-gray-900 text-sm">Résultats de l'Analyse IA</h3>
                  </div>
                  <p className="text-sm text-gray-700 bg-blue-50/50 p-3 rounded-lg border border-blue-200/50">{analysisResult.explanation}</p>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="suggestions">
                    <AccordionTrigger>Suggestions d'amélioration</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                        {analysisResult.suggestions.map((item, index) => <li key={`sugg-${index}`}>{item}</li>)}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="ideas">
                    <AccordionTrigger>Idées créatives</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                        {analysisResult.ideas.map((item, index) => <li key={`idea-${index}`}>{item}</li>)}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="actions">
                    <AccordionTrigger>Actions possibles</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                        {analysisResult.actions.map((item, index) => <li key={`act-${index}`}>{item}</li>)}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
          <div className="px-4 py-6 space-y-4">
            {!user ? (
              <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Messages</h2>
                <p className="text-sm text-gray-600 mb-6">Envoyez et recevez des messages</p>
                <button 
                  onClick={() => setShowLogin(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium"
                >
                  Se connecter
                </button>
              </div>
            ) : (
              <>
                {/* Header avec recherche */}
                <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Messages</h2>
                    <button className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <Plus className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Rechercher des conversations..."
                      className="w-full pl-10 pr-4 py-3 border-2 border-blue-200/50 rounded-xl focus:border-blue-500 focus:outline-none bg-blue-50/30 backdrop-blur-sm text-sm"
                    />
                  </div>
                </div>

                {/* Filtres rapides */}
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  <button className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-xs font-medium">
                    Tous
                  </button>
                  <button className="flex-shrink-0 px-4 py-2 backdrop-blur-lg bg-white/90 border border-blue-200/50 text-gray-600 rounded-full text-xs font-medium">
                    Non lus
                  </button>
                  <button className="flex-shrink-0 px-4 py-2 backdrop-blur-lg bg-white/90 border border-blue-200/50 text-gray-600 rounded-full text-xs font-medium">
                    Favoris
                  </button>
                  <button className="flex-shrink-0 px-4 py-2 backdrop-blur-lg bg-white/90 border border-blue-200/50 text-gray-600 rounded-full text-xs font-medium">
                    Groupes
                  </button>
                </div>

                {/* Liste des conversations */}
                <div className="space-y-3">
                  {/* Conversation 1 - Non lue */}
                  <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-4 active:bg-blue-50 transition-all duration-300">
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">MA</span>
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">Marie Dubois</h3>
                          <span className="text-xs text-gray-500">10:30</span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          Salut ! J'ai vu ton message sur le projet. Est-ce qu'on peut en discuter aujourd'hui ?
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-600">En ligne</span>
                          </div>
                          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-medium">2</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conversation 2 - Groupe */}
                  <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-4 active:bg-blue-50 transition-all duration-300">
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">Équipe Design</h3>
                          <span className="text-xs text-gray-500">Hier</span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          <span className="font-medium">Thomas:</span> Les maquettes sont prêtes pour review 👍
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <div className="flex -space-x-1">
                              <div className="w-4 h-4 bg-blue-400 rounded-full border border-white"></div>
                              <div className="w-4 h-4 bg-green-400 rounded-full border border-white"></div>
                              <div className="w-4 h-4 bg-yellow-400 rounded-full border border-white"></div>
                            </div>
                            <span className="text-xs text-gray-500 ml-1">+3</span>
                          </div>
                          <div className="text-xs text-gray-400">5 membres</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conversation 3 - Normale */}
                  <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-4 active:bg-blue-50 transition-all duration-300">
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">JM</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">Jean Martin</h3>
                          <span className="text-xs text-gray-500">Mar</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                          Merci pour ton aide sur le dossier client. Tout est bon maintenant !
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="text-xs text-gray-400">Hors ligne</span>
                          </div>
                          <div className="text-xs text-blue-600">✓✓</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conversation 4 - IA Assistant */}
                  <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-4 active:bg-blue-50 transition-all duration-300">
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <Bot className="h-6 w-6 text-white" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                          <Sparkles className="h-2 w-2 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900 text-sm truncate">Assistant FICHE</h3>
                            <div className="px-2 py-0.5 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full">
                              <span className="text-xs text-blue-600 font-medium">IA</span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">Lun</span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          J'ai analysé votre dernier texte. Voulez-vous voir mes suggestions d'amélioration ?
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-blue-600">Toujours disponible</span>
                          </div>
                          <div className="text-xs text-blue-600">✓</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conversation 5 - Archivée */}
                  <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-gray-200/50 p-4 active:bg-gray-50 transition-all duration-300 opacity-60">
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">LC</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-700 text-sm truncate">Lisa Chen</h3>
                          <span className="text-xs text-gray-400">03/06</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                          Parfait pour la présentation de demain. À bientôt !
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-400">Archivée</div>
                          <div className="text-xs text-gray-400">✓✓</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bouton flottant pour nouveau message */}
                <div className="fixed bottom-24 right-4 z-10">
                  <button className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl">
                    <Plus className="h-6 w-6 text-white" />
                  </button>
                </div>
              </>
            )}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 border-2 border-blue-200/50 rounded-xl focus:border-blue-500 focus:outline-none bg-blue-50/30 backdrop-blur-sm text-sm"
                />
                <input 
                  type="password" 
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 border-2 border-blue-200/50 rounded-xl focus:border-blue-500 focus:outline-none bg-blue-50/30 backdrop-blur-sm text-sm"
                />
              </div>
              <div className="space-y-3">
                <button 
                  onClick={handleEmailSignIn}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-medium"
                >
                  Se connecter
                </button>
                <button 
                  onClick={handleEmailSignUp}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-4 rounded-xl font-medium"
                >
                  Créer un compte
                </button>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-400 text-xs">OU</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <button 
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center space-x-2"
                >
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.021,35.596,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                    </svg>
                    <span>Se connecter avec Google</span>
                </button>

                <button 
                  onClick={() => setShowLogin(false)}
                  className="w-full border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-medium mt-4"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FicheApp;

    