import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword,signInWithEmailAndPassword,signInWithPopup, GoogleAuthProvider,signOut  } from "firebase/auth";
import axios from "axios";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_Apikey,
  authDomain: import.meta.env.VITE_AuthDomain,
  projectId: import.meta.env.VITE_ProjectId,
  storageBucket: import.meta.env.VITE_StorageBucket,
  messagingSenderId: import.meta.env.VITE_MessagingSenderId,
  appId: import.meta.env.VITE_AppId,
  measurementId:import.meta.env.VITE_MeasurementId 
};

const provider = new GoogleAuthProvider();

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


const getFirebaseToken = async () => {
  const user = auth.currentUser;

  if (user) {
    try {
      const token = await user.getIdToken(); // Get the Firebase ID token
      // console.log("Token:", token);

      // Send the token to the server
      const response = await axios
        .post(import.meta.env.VITE_Backend_URL + "/firebaseTokenVerify",{token})
        // .then(res => console.log(res))
        .catch(err => console.error(err));
    } catch (error) {
      console.error("Error getting token:", error);
    }
  }
};



export const googleSignInPopUp = async ()=>{
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential.accessToken;
    const user = result.user;

    // Get token and send it to backend for verification
    await getFirebaseToken();
    console.log(`User signed in`);
    return true; // Explicitly return true when successful
  } catch (error) {
    // Handle Errors here
    const errorCode = error.code;
    const errorMessage = error.message;
    const email = error.customData?.email;
    const credential = GoogleAuthProvider.credentialFromError(error);
    console.error(`Sign-in error: ${errorCode} - ${errorMessage}`);
    return false; // Return false on error
  }
}

export const createUser = async (email, password)=>{
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await getFirebaseToken();
    return true;
  } catch (error) {
    // console.log(error)
    return error;
  }
}

export const signIn = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user; // Fixed reference to the userCredential
    await getFirebaseToken(); // Ensure this function is defined and implemented
    return true;
  } catch (error) {
    return false;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Error signing out:", error.message);
  }
};