import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAZm0HZzqAzIF-Yn-wdYimgOIpNt9u3-sA",
  authDomain: "fridge-tracker-3c324.firebaseapp.com",
  projectId: "fridge-tracker-3c324",
  storageBucket: "fridge-tracker-3c324.appspot.com",
  messagingSenderId: "88519948075",
  appId: "1:88519948075:web:c48be5452562fc4b7b376e",
  measurementId: "G-QJPRB62ECE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };