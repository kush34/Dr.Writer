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
      console.log("Token:", token);

      // Send the token to the server
      const response = await axios
        .post(import.meta.env.VITE_Backend_URL + "/firebaseTokenVerify",{token})
        .then(res => console.log(res))
        .catch(err => console.error(err));
    } catch (error) {
      console.error("Error getting token:", error);
    }
  }
};



export const googleSignInPopUp = async ()=>{
  signInWithPopup(auth, provider)
  .then((result) => {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential.accessToken;
    const user = result.user;
    
    //get token and send it to backend for verification
    getFirebaseToken();

  }).catch((error) => {
    // Handle Errors here.
    // The email of the user's account used.
    // The AuthCredential type that was used.
    const errorCode = error.code;
    const errorMessage = error.message;
    const email = error.customData.email;
    const credential = GoogleAuthProvider.credentialFromError(error);
    // ...
  });
}

export const createUser = async (email, password)=>{
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed up 
        const user = userCredential.user;
        // ...
        getFirebaseToken();
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(error)
        // ..
      });   
}

export const signIn = async (email, password)=>{
    signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // Signed in 
    const user = userCredential.user;
    console.log(user);
    
    // ...
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.log(error)
  });
}

export const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Error signing out:", error.message);
  }
};