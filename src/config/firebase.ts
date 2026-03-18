import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB5OBi-GSWP_GlyJkjsce44GcUaJEXx73s",
  authDomain: "lobo-test-e080f.firebaseapp.com",
  projectId: "lobo-test-e080f",
  storageBucket: "lobo-test-e080f.firebasestorage.app",
  messagingSenderId: "767492319864",
  appId: "1:767492319864:web:6207e4a7088bd3db1bdb8d",
  measurementId: "G-GLQQ0QKKLP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
