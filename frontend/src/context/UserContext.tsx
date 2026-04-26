import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth } from "@/firebaseAuth/firebaseConfig";
import { useNavigate } from 'react-router-dom';
import Loader from '@/components/loaders/Loader';
import * as firebaseAuth from "@/firebaseAuth/firebaseConfig"
import { onAuthStateChanged } from 'firebase/auth';

type tUser = {
    displayName: string | null
    email: string | null
    photoURL: string | null
    emailVerified: boolean
}
type tUserContext = {
    user: tUser | null
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
    loading: boolean
}
const UserContext = createContext<tUserContext | null>(null);

const UserContextProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<tUser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();
    useEffect(() => {
        // const auth = getAuth();

        // Listener for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser({
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified,
                });
            } else {
                setUser(null);
                navigate("/")
            }
            setLoading(false); // Stop loading when user data is fetched
        });

        return () => unsubscribe(); // Cleanup on unmount
    }, []);
    if (loading) return (
        <div>
            <Loader />
        </div>
    )
    return (
        <UserContext.Provider value={{ user, loading, setLoading }}>
            {children}
        </UserContext.Provider>
    );
};

const useUser = () => {
    const ctx = useContext(UserContext);
    if (!ctx) {
        throw new Error("useTheme must be used inside ThemeProvider");
    }
    return ctx;
};

export { UserContext, UserContextProvider, useUser };
