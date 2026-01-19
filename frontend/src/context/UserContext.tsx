import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";


type tUser = {
    displayName:string | null
    email:string | null
    photoURL:string | null
    emailVerified:boolean
}
type tUserContext = {
    user:tUser | null
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
    loading:boolean
}
const UserContext = createContext<tUserContext | null>(null);

const UserContextProvider = ({ children }:{ children : ReactNode}) => {
    const [user, setUser] = useState<tUser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const auth = getAuth();

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
                setUser(null); // Clear user data on logout
            }
            setLoading(false); // Stop loading when user data is fetched
        });

        return () => unsubscribe(); // Cleanup on unmount
    }, []);

    return (
        <UserContext.Provider value={{ user, loading, setLoading }}>
            {children}
        </UserContext.Provider>
    );
};

export { UserContext, UserContextProvider };
