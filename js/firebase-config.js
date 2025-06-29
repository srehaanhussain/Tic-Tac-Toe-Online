// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBY781_C7fP2XUfXgdtOPhbguopyAHqvjA",
    authDomain: "tic-tac-toe-online-app1.firebaseapp.com",
    projectId: "tic-tac-toe-online-app1",
    storageBucket: "tic-tac-toe-online-app1.firebasestorage.app",
    messagingSenderId: "899629606416",
    appId: "1:899629606416:web:c36b44283302b50bc08c95",
    measurementId: "G-BB5JNZWGY0"
  };
  
  

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Error initializing Firebase:", error);
    alert("Error initializing Firebase: " + error.message);
}

// Initialize Firebase services
const auth = firebase.auth();
const database = firebase.database(); 