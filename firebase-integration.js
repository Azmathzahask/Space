// Firebase Integration for Space Habitat Designer

// Import Firebase SDK
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Firebase configuration (replace with your own)
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to add tenant data to Firestore
async function addTenantData() {
    const tenantData = [
        {
            name: "John Doe",
            amount: 1500,
            apartment_number: "A101",
            number: "1234567890",
            dateStartForm: "2023-01-01",
            dateEndAt: "2023-12-31"
        },
        {
            name: "Jane Smith",
            amount: 1600,
            apartment_number: "B202",
            number: "0987654321",
            dateStartForm: "2023-02-01",
            dateEndAt: "2023-11-30"
        },
        {
            name: "Bob Johnson",
            amount: 1400,
            apartment_number: "C303",
            number: "1122334455",
            dateStartForm: "2023-03-01",
            dateEndAt: "2023-10-31"
        }
    ];

    try {
        for (const tenant of tenantData) {
            const docRef = await addDoc(collection(db, "tenants"), tenant);
            console.log("Document written with ID: ", docRef.id);
        }
        alert("Tenant data added to Firebase successfully!");
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Error adding data to Firebase. Check console for details.");
    }
}

// Function to get tenant data from Firestore
async function getTenantData() {
    try {
        const querySnapshot = await getDocs(collection(db, "tenants"));
        const tenants = [];
        querySnapshot.forEach((doc) => {
            tenants.push({ id: doc.id, ...doc.data() });
        });
        console.log("Tenant data:", tenants);
        return tenants;
    } catch (e) {
        console.error("Error getting documents: ", e);
        return [];
    }
}

// Expose functions globally
window.addTenantData = addTenantData;
window.getTenantData = getTenantData;
