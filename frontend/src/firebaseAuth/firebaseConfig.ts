import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import axios from "axios";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_Apikey,
  authDomain: import.meta.env.VITE_AuthDomain,
  projectId: import.meta.env.VITE_ProjectId,
  storageBucket: import.meta.env.VITE_StorageBucket,
  messagingSenderId: import.meta.env.VITE_MessagingSenderId,
  appId: import.meta.env.VITE_AppId,
  measurementId: import.meta.env.VITE_MeasurementId
};

const provider = new GoogleAuthProvider();

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const normalizeError = (error: unknown) => {
  if (error instanceof FirebaseError) {
    return {
      type: "firebase",
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      type: "error",
      code: null,
      message: error.message,
    };
  }

  return {
    type: "unknown",
    code: null,
    message: "An unknown error occurred",
  };
};


const getFirebaseToken = async () => {
  const user = auth.currentUser;

  if (user) {
    try {
      const token = await user.getIdToken(); // Get the Firebase ID token
      // console.log("Token:", token);

      // Send the token to the server
      const response = await axios
        .post(import.meta.env.VITE_Backend_URL + "/firebaseTokenVerify", { token })
        // .then(res => console.log(res))
        .catch(err => console.error(err));
    } catch (error) {
      console.error("Error getting token:", error);
    }
  }
};



export const googleSignInPopUp = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    await getFirebaseToken();
    return { success: true };
  } catch (error) {
    const err = normalizeError(error);
    console.error("Google sign-in failed:", err.code, err.message);
    return { success: false, ...err };
  }
};

type CreateUserResult =
  | { success: true; user: User }
  | { success: false; message: string; code?: string };

export const createUser = async (
  email: string,
  password: string
): Promise<CreateUserResult> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await getFirebaseToken();

    return {
      success: true,
      user: userCredential.user,
    };
  } catch (error) {
    const err = normalizeError(error);

    console.error("Create user failed:", err.code, err.message);

    return {
      success: false,
      message: err.message,
      code: err.code,
    };
  }
};



export const signIn = async (email: string, password: string) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    await getFirebaseToken();
    return { success: true };
  } catch (error) {
    const err = normalizeError(error);
    console.error("Sign-in failed:", err.code, err.message);
    return { success: false, ...err };
  }
};


export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    const err = normalizeError(error);
    console.error("Sign-out failed:", err.code, err.message);
    return { success: false, ...err };
  }
};
