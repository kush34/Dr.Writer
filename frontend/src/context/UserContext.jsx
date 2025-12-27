import { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";

const UserContext = createContext(null);

const UserContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

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
