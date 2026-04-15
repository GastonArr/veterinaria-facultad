'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithCustomToken,
  verifyPasswordResetCode,
  confirmPasswordReset,
  sendEmailVerification,
  reload,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

/**
 * Contexto de autenticación global.
 *
 * Centraliza:
 * - Estado del usuario autenticado.
 * - Estado de carga inicial del auth listener.
 * - Operaciones de login, registro, logout y recuperación de contraseña.
 */
const AuthContext = createContext();

/** Hook de conveniencia para consumir el contexto de autenticación. */
export const useAuth = () => useContext(AuthContext);

/**
 * Proveedor principal de autenticación para toda la app.
 *
 * No modifica la UI: solamente expone estado y acciones para la capa de presentación.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Única fuente de verdad sobre sesión autenticada en cliente.
    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      try {
        if (userAuth) {
          // Intentamos enriquecer la info del SDK con el perfil persistido.
          const userDocRef = doc(db, 'users', userAuth.uid);
          const userDocSnap = await getDoc(userDocRef);
          const isPasswordProvider = userAuth.providerData?.some(
            (provider) => provider.providerId === 'password'
          );
          const requiresEmailVerification = isPasswordProvider && !userAuth.emailVerified;

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUser({ ...userAuth, ...userData });
          } else if (requiresEmailVerification) {
            // Aún no creamos perfil en Firestore para cuentas por email no verificadas.
            setUser(userAuth);
          } else {
            // Primer ingreso (por ejemplo, con Google): creamos perfil mínimo.
            const newUser = {
              uid: userAuth.uid,
              email: userAuth.email,
              displayName: userAuth.displayName || 'Sin Nombre',
              photoURL: userAuth.photoURL || null,
              role: 'dueño',
              profileCompleted: false,
              createdAt: new Date(),
            };

            await setDoc(userDocRef, newUser);
            setUser({ ...userAuth, ...newUser });
          }

          setIsLoggedIn(true);
        } else {
          // Sin sesión activa.
          setUser(null);
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Error en onAuthStateChanged:', error);
        // Fallback seguro: ante error evitamos dejar estado inconsistente.
        setUser(null);
        setIsLoggedIn(false);
      } finally {
        // loading=false indica que ya resolvimos el estado inicial de auth.
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /** Inicia sesión con Google mediante popup. */
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  /** Cierra la sesión actual en Firebase Auth. */
  const signOut = () => firebaseSignOut(auth);

  /** Inicia sesión con custom token (flujo interno / backend). */
  const signInWithToken = (token) => signInWithCustomToken(auth, token);

  /** Inicia sesión con email y contraseña. */
  const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);

  /** Registra un nuevo usuario con email y contraseña. */
  const registerWithEmailAndPassword = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  /** Envía email de recuperación de contraseña. */
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  /** Envía email de verificación al usuario autenticado actual. */
  const sendVerificationEmail = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No hay usuario autenticado.');

    const actionCodeSettings = {
      url: `${window.location.origin}/verificar-email`,
      handleCodeInApp: false,
    };

    return sendEmailVerification(currentUser, actionCodeSettings);
  };

  /**
   * Refresca el estado del usuario autenticado para obtener claims recientes
   * (por ejemplo emailVerified luego de abrir el enlace de verificación).
   */
  const refreshCurrentUser = async () => {
    if (!auth.currentUser) return null;
    await reload(auth.currentUser);
    return auth.currentUser;
  };

  /**
   * Cambia la contraseña del usuario actual.
   *
   * Firebase exige reautenticación previa para operaciones sensibles.
   */
  const changePassword = async (currentPassword, newPassword) => {
    const userCredential = auth.currentUser;
    if (!userCredential) throw new Error('No hay usuario autenticado.');

    const credential = EmailAuthProvider.credential(userCredential.email, currentPassword);
    await reauthenticateWithCredential(userCredential, credential);

    return updatePassword(userCredential, newPassword);
  };

  /** Verifica validez del código de reseteo recibido por email. */
  const verifyResetCode = (code) => verifyPasswordResetCode(auth, code);

  /** Confirma el cambio de contraseña usando el código de reseteo. */
  const handlePasswordReset = (code, newPassword) =>
    confirmPasswordReset(auth, code, newPassword);

  const value = {
    user,
    isLoggedIn,
    loading,
    loginWithGoogle,
    signOut,
    // Alias mantenido por compatibilidad para no romper consumidores existentes.
    logout: signOut,
    signInWithToken,
    loginWithEmail,
    registerWithEmailAndPassword,
    resetPassword,
    sendVerificationEmail,
    refreshCurrentUser,
    changePassword,
    verifyResetCode,
    handlePasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
